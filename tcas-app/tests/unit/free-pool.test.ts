import { describe, it, expect } from 'vitest'
import { canTriggerGen } from '@/lib/practice/free-pool'

describe('canTriggerGen', () => {
  it('free user can NEVER trigger gen', () => {
    expect(canTriggerGen('free')).toBe(false)
    expect(canTriggerGen('trial_expired_free')).toBe(false)
  })
  it('trial/paid can trigger gen (escape-hatch eligible)', () => {
    expect(canTriggerGen('trial')).toBe(true)
    expect(canTriggerGen('paid')).toBe(true)
  })
})
