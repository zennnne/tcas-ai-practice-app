import { describe, it, expect } from 'vitest'
import { parseChargeComplete } from '@/app/api/webhooks/omise/route'

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
    expect(parseChargeComplete({ key: 'refund.create', data: {} })).toBeNull()
  })
})
