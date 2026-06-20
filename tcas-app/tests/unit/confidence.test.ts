import { describe, it, expect } from 'vitest'
import { recomputeConfidence, CONFIDENCE_FLOOR } from '@/lib/quality/confidence'

describe('recomputeConfidence', () => {
  const base = { current: 80, weightedReports: 0, goodRatings: 10, badRatings: 0 }

  it('ไม่มี report + rating ดี → confidence คงสูง/ขึ้น', () => {
    expect(recomputeConfidence(base)).toBeGreaterThanOrEqual(80)
  })
  it('weighted report เยอะ → confidence ลงแรง', () => {
    const r = recomputeConfidence({ ...base, weightedReports: 5 })
    expect(r).toBeLessThan(80)
  })
  it('rating แย่เยอะ → confidence ลง', () => {
    const r = recomputeConfidence({ ...base, goodRatings: 0, badRatings: 10 })
    expect(r).toBeLessThan(80)
  })
  it('confidence ไม่หลุดช่วง 0-100', () => {
    expect(recomputeConfidence({ ...base, weightedReports: 999 })).toBeGreaterThanOrEqual(0)
    expect(recomputeConfidence({ current: 99, weightedReports: 0, goodRatings: 999, badRatings: 0 })).toBeLessThanOrEqual(100)
  })
  it('CONFIDENCE_FLOOR กำหนดไว้ (จุด auto-remove)', () => {
    expect(CONFIDENCE_FLOOR).toBeGreaterThan(0)
    expect(CONFIDENCE_FLOOR).toBeLessThan(70)
  })
})
