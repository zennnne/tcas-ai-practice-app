import { createAdminClient } from '@/lib/supabase/admin'
import { verifySignature, parseChargeComplete } from '@/lib/billing/webhook'
import { captureMessage } from '@/lib/monitoring/capture'
import { sendEmail } from '@/lib/email/send'

const VALID_TIERS = new Set(['tier1', 'tier2'])

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-omise-signature')
  if (!verifySignature(rawBody, signature, process.env.OMISE_WEBHOOK_SECRET ?? '')) {
    return new Response('unauthorized', { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const intent = parseChargeComplete(event)
  if (!intent || !intent.upgrade) return new Response('ok', { status: 200 })

  if (!VALID_TIERS.has(intent.tier)) return new Response('bad_request', { status: 400 })

  const db = createAdminClient()

  // Idempotency: atomic INSERT — duplicate event_id (23505) means already processed
  const { error: dedupError } = await db
    .from('processed_webhook_events')
    .insert({ event_id: intent.eventId, event_key: event.key })
  if (dedupError) {
    if (dedupError.code === '23505') return new Response('ok', { status: 200 })
    console.error('webhook: dedup insert error', dedupError)
    captureMessage('webhook: dedup insert failed', 'error', {
      eventId: intent.eventId,
      code: dedupError.code,
    })
    return new Response('internal_error', { status: 500 })
  }

  // Apply subscription upgrade; verify at least one row was written
  const { data: updated, error: updateError } = await db
    .from('subscriptions')
    .update({ status: 'paid', tier: intent.tier, updated_at: new Date().toISOString() })
    .eq('user_id', intent.userId)
    .select('user_id')

  if (updateError || !updated || updated.length === 0) {
    // Paid but no subscription row → rollback dedup so Omise can retry
    await db.from('processed_webhook_events').delete().eq('event_id', intent.eventId)
    console.error('webhook: no subscription row for user', intent.userId, 'event', intent.eventId)
    captureMessage('webhook: paid but no subscription row', 'error', {
      userId: intent.userId,
      eventId: intent.eventId,
    })
    return new Response('no_subscription_row', { status: 500 })
  }

  // Receipt email — fire after successful activation, NOT on dedup skip
  try {
    const { data: authUser } = await db.auth.admin.getUserById(intent.userId)
    const email = authUser?.user?.email
    if (email) {
      await sendEmail('receipt', email, {
        tier: intent.tier,
        date: new Date().toISOString().slice(0, 10),
      })
    }
  } catch (err) {
    captureMessage('webhook: receipt email lookup failed', 'warning', {
      userId: intent.userId,
      error: String(err),
    })
  }

  return new Response('ok', { status: 200 })
}
