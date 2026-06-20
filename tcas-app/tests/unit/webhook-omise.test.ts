import { createHmac } from 'crypto'
import { describe, it, expect } from 'vitest'
import { parseChargeComplete, verifySignature } from '@/lib/billing/webhook'

describe('parseChargeComplete', () => {
  it('successful charge → upgrade (user_id, tier, paid)', () => {
    const event = {
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier2' } },
    }
    expect(parseChargeComplete(event)).toEqual({ userId: 'u1', tier: 'tier2', upgrade: true })
  })
  it('failed charge → no upgrade', () => {
    const event = { key: 'charge.complete', data: { status: 'failed', metadata: { user_id: 'u1', tier: 'tier1' } } }
    expect(parseChargeComplete(event)!.upgrade).toBe(false)
  })
  it('non-charge event → null', () => {
    expect(parseChargeComplete({ key: 'refund.create', data: { status: 'successful' } })).toBeNull()
  })
  it('missing metadata → null (ป้องกัน undefined userId ใน DB update)', () => {
    expect(parseChargeComplete({ key: 'charge.complete', data: { status: 'successful' } })).toBeNull()
  })
  it('metadata บางส่วน (ไม่มี tier) → null', () => {
    expect(parseChargeComplete({
      key: 'charge.complete', data: { status: 'successful', metadata: { user_id: 'u1' } },
    })).toBeNull()
  })
})

describe('verifySignature', () => {
  const secret = 'test_webhook_secret'
  const body = '{"key":"charge.complete"}'
  const validSig = createHmac('sha256', secret).update(body).digest('hex')

  it('signature ถูกต้อง → true', () => {
    expect(verifySignature(body, validSig, secret)).toBe(true)
  })
  it('signature ผิด → false', () => {
    expect(verifySignature(body, 'deadeaddeadbeef', secret)).toBe(false)
  })
  it('signature null → false', () => {
    expect(verifySignature(body, null, secret)).toBe(false)
  })
  it('secret ว่าง → false', () => {
    expect(verifySignature(body, validSig, '')).toBe(false)
  })
})
