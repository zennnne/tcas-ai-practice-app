import { describe, it, expect } from 'vitest'
import { downgradeTarget } from '@/lib/billing/trial'

const now = new Date('2026-09-10T00:00:00Z')

describe('downgradeTarget', () => {
  it('trial past trial_ends_at → trial_expired_free', () => {
    expect(downgradeTarget({ status: 'trial', trialEndsAt: '2026-09-01T00:00:00Z' }, now))
      .toBe('trial_expired_free')
  })
  it('trial still within window → no change (null)', () => {
    expect(downgradeTarget({ status: 'trial', trialEndsAt: '2026-09-20T00:00:00Z' }, now))
      .toBeNull()
  })
  it('paid never downgrades on expiry', () => {
    expect(downgradeTarget({ status: 'paid', trialEndsAt: '2026-09-01T00:00:00Z' }, now))
      .toBeNull()
  })
})
