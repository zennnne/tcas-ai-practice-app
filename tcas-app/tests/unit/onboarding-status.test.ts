import { describe, it, expect } from 'vitest'
import { isFirstVisit } from '@/lib/onboarding/status'

describe('isFirstVisit', () => {
  it('no attempts yet → first visit (show onboarding)', () => {
    expect(isFirstVisit(0)).toBe(true)
  })
  it('has at least one attempt → not first visit (never shows again)', () => {
    expect(isFirstVisit(1)).toBe(false)
    expect(isFirstVisit(42)).toBe(false)
  })
})
