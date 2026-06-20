import { describe, it, expect } from 'vitest'
import { routeQuestion } from '@/lib/quality/routing'

describe('routeQuestion', () => {
  it('practice โจทย์ตกฟลอร์ → auto-remove + regen', () => {
    expect(routeQuestion({ confidence: 40, mockEligible: false })).toBe('auto_remove_regen')
  })
  it('โจทย์เหนือฟลอร์ → no action', () => {
    expect(routeQuestion({ confidence: 75, mockEligible: false })).toBe('none')
  })
  it('mock-eligible(90+) ถูก report จนตก → review queue (ไม่ auto-remove)', () => {
    expect(routeQuestion({ confidence: 40, mockEligible: true })).toBe('review_queue')
  })
  it('mock-eligible ที่ confidence ยังสูง → no action', () => {
    expect(routeQuestion({ confidence: 92, mockEligible: true })).toBe('none')
  })
})
