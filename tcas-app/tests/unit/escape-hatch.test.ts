import { describe, it, expect } from 'vitest'
import { shouldTriggerEscapeHatch } from '@/lib/content/escape-hatch'

describe('shouldTriggerEscapeHatch', () => {
  it('fires when available=0 and under daily cap', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 0, todayCount: 2, dailyCap: 10 })).toBe(true)
  })
  it('does NOT fire when pool still has questions', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 3, todayCount: 0, dailyCap: 10 })).toBe(false)
  })
  it('does NOT fire when daily cap reached (cost guard)', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 0, todayCount: 10, dailyCap: 10 })).toBe(false)
  })
})
