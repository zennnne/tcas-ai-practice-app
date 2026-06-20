export const CONFIDENCE_FLOOR = 50 // ต่ำกว่านี้ = auto-remove (practice/social) — tune §9

export interface ConfidenceInput {
  current: number
  weightedReports: number      // sum ของ report × reporterWeight
  goodRatings: number
  badRatings: number
}

// report ดึงลงแรง (×8/report weighted), rating ปรับเบา
export function recomputeConfidence(i: ConfidenceInput): number {
  const reportPenalty = i.weightedReports * 8
  const totalRatings = i.goodRatings + i.badRatings
  const ratingAdj = totalRatings === 0
    ? 0
    : ((i.goodRatings - i.badRatings) / totalRatings) * 5 // -5..+5
  const next = i.current - reportPenalty + ratingAdj
  return Math.max(0, Math.min(100, next))
}
