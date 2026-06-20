import { describe, it, expect } from 'vitest'
import { validateReport, REPORT_CATEGORIES, type ReportContext } from '@/lib/quality/antispam'

const ctx: ReportContext = { todayReportCount: 2, dailyLimit: 10, alreadyReported: false }

describe('validateReport', () => {
  it('ต้องมี category ที่ถูกต้อง', () => {
    expect(validateReport('wrong_answer', ctx).ok).toBe(true)
    expect(validateReport('lol', ctx).ok).toBe(false)
    expect(validateReport('', ctx).ok).toBe(false)
  })
  it('rate-limit: เกิน daily limit → ปฏิเสธ', () => {
    expect(validateReport('wrong_answer', { ...ctx, todayReportCount: 10 }).ok).toBe(false)
  })
  it('กด report ข้อเดิมซ้ำ → ปฏิเสธ', () => {
    expect(validateReport('wrong_answer', { ...ctx, alreadyReported: true }).ok).toBe(false)
  })
  it('categories ครบ (เฉลยผิด/กำกวม/พิมพ์ผิด/อื่นๆ)', () => {
    expect(REPORT_CATEGORIES).toContain('wrong_answer')
    expect(REPORT_CATEGORIES.length).toBeGreaterThanOrEqual(3)
  })
})
