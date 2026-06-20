import { createAdminClient } from '@/lib/supabase/admin'
import { verifySignature, parseChargeComplete } from '@/lib/billing/webhook'

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
  await db.from('subscriptions').update({
    status: 'paid', tier: intent.tier, updated_at: new Date().toISOString(),
  }).eq('user_id', intent.userId)
  return new Response('ok', { status: 200 })
}
