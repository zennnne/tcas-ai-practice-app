import { createAdminClient } from '@/lib/supabase/admin'

export interface OmiseEvent { key: string; data: any }
export interface UpgradeIntent { userId: string; tier: string; upgrade: boolean }

export function parseChargeComplete(event: OmiseEvent): UpgradeIntent | null {
  if (event.key !== 'charge.complete') return null
  const m = event.data?.metadata ?? {}
  return { userId: m.user_id, tier: m.tier, upgrade: event.data?.status === 'successful' }
}

export async function POST(req: Request) {
  // ⚠️ TODO: verify webhook signature ด้วย OMISE_WEBHOOK_SECRET ก่อน trust payload
  const event = (await req.json()) as OmiseEvent
  const intent = parseChargeComplete(event)
  if (!intent || !intent.upgrade) return new Response('ok', { status: 200 })

  const db = createAdminClient()
  await db.from('subscriptions').update({
    status: 'paid', tier: intent.tier, updated_at: new Date().toISOString(),
  }).eq('user_id', intent.userId)
  return new Response('ok', { status: 200 })
}
