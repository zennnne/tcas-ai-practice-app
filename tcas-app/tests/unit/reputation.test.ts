import { describe, it, expect } from 'vitest'
import { reportWeight } from '@/lib/quality/reputation'

describe('reportWeight', () => {
  it('user ใหม่ (ไม่มีประวัติ) = น้ำหนักกลาง 1.0', () => {
    expect(reportWeight({ confirmed: 0, rejected: 0 })).toBeCloseTo(1.0)
  })
  it('report ตรงบ่อย → น้ำหนัก > 1', () => {
    expect(reportWeight({ confirmed: 9, rejected: 1 })).toBeGreaterThan(1.0)
  })
  it('report มั่วบ่อย → น้ำหนัก < 1', () => {
    expect(reportWeight({ confirmed: 1, rejected: 9 })).toBeLessThan(1.0)
  })
  it('น้ำหนัก clamp ไม่ติดลบ', () => {
    expect(reportWeight({ confirmed: 0, rejected: 100 })).toBeGreaterThanOrEqual(0)
  })
})
