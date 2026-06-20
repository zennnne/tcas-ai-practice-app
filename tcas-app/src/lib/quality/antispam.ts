export const REPORT_CATEGORIES = ['wrong_answer', 'ambiguous', 'typo', 'other'] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export const DAILY_REPORT_LIMIT = 10

export interface ReportContext {
  todayReportCount: number
  alreadyReported: boolean
}

export function validateReport(category: string, ctx: ReportContext): { ok: boolean; reason?: string } {
  if (!REPORT_CATEGORIES.includes(category as ReportCategory))
    return { ok: false, reason: 'ต้องเลือก category ที่ถูกต้อง' }
  if (ctx.alreadyReported) return { ok: false, reason: 'report ข้อนี้ไปแล้ว' }
  if (ctx.todayReportCount >= DAILY_REPORT_LIMIT) return { ok: false, reason: 'report เกินโควต้าวันนี้' }
  return { ok: true }
}
