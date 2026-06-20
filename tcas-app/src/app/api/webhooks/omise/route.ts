import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

interface OmiseChargeData {
  status: string
  metadata?: { user_id?: string; tier?: string }
}
export interface OmiseEvent { key: string; data: OmiseChargeData }
export interface UpgradeIntent { userId: string; tier: string; upgrade: boolean }

const VALID_TIERS = new Set(['tier1', 'tier2'])

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return timingSafeEqual(sigBuf, expBuf)
}

export function parseChargeComplete(event: OmiseEvent): UpgradeIntent | null {
  if (event.key !== 'charge.complete') return null
  const meta = event.data?.metadata ?? {}
  const userId = meta.user_id
  const tier = meta.tier
  if (!userId || !tier) return null
  return { userId, tier, upgrade: event.data?.status === 'successful' }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-omise-signature')
  if (!verifySignature(rawBody, signature, process.env.OMISE_WEBHOOK_SECRET ?? '')) {
    return new Response('unauthorized', { status: 401 })
  }

  const event = JSON.parse(rawBody) as OmiseEvent
  const intent = parseChargeComplete(event)
  if (!intent || !intent.upgrade) return new Response('ok', { status: 200 })

  if (!VALID_TIERS.has(intent.tier)) return new Response('bad_request', { status: 400 })

  const db = createAdminClient()
  await db.from('subscriptions').update({
    status: 'paid', tier: intent.tier, updated_at: new Date().toISOString(),
  }).eq('user_id', intent.userId)
  return new Response('ok', { status: 200 })
}
