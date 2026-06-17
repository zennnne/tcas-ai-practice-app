import { describe, it, expect } from 'vitest'
import { isPromotable, type QualityStats } from '@/lib/mock/promote'

const good: QualityStats = {
  usageCount: 60, reportRate: 0.01, goodRatingRatio: 0.85,
  discrimination: 0.4, rd: 60,
}

describe('isPromotable (70→90)', () => {
  it('ผ่านครบทุกเงื่อนไข → promotable', () => {
    expect(isPromotable(good).ok).toBe(true)
  })
  it('usage น้อยไป → ไม่ผ่าน', () => {
    expect(isPromotable({ ...good, usageCount: 10 }).ok).toBe(false)
  })
  it('report rate สูง → ไม่ผ่าน', () => {
    expect(isPromotable({ ...good, reportRate: 0.2 }).ok).toBe(false)
  })
  it('discrimination ต่ำ (โจทย์ไม่แยกเก่ง/อ่อน) → ไม่ผ่าน', () => {
    expect(isPromotable({ ...good, discrimination: 0.05 }).ok).toBe(false)
  })
  it('RD สูง (ยังไม่ converge) → ไม่ผ่าน', () => {
    expect(isPromotable({ ...good, rd: 200 }).ok).toBe(false)
  })
})
