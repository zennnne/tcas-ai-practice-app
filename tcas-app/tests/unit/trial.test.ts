import { describe, it, expect } from 'vitest'
import { downgradeTarget, trialDaysLeft } from '@/lib/billing/trial'

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

describe('trialDaysLeft', () => {
  it('rounds up partial days remaining', () => {
    expect(trialDaysLeft('2026-09-15T00:00:00Z', now)).toBe(5)
    expect(trialDaysLeft('2026-09-10T12:00:00Z', now)).toBe(1)
  })
  it('never goes negative once trial has ended', () => {
    expect(trialDaysLeft('2026-09-01T00:00:00Z', now)).toBe(0)
  })
})
