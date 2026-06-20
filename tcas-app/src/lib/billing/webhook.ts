import { createHmac, timingSafeEqual } from 'crypto'

export interface OmiseChargeData {
  status: string
  metadata?: { user_id?: string; tier?: string }
}
export interface OmiseEvent { key: string; data: OmiseChargeData }
export interface UpgradeIntent { userId: string; tier: string; upgrade: boolean }

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
