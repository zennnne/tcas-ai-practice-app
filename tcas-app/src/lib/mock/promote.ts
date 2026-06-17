export interface QualityStats {
  usageCount: number       // จำนวน attempt
  reportRate: number       // reports / attempts
  goodRatingRatio: number  // 'good' / total ratings
  discrimination: number   // คนเก่งทำถูกมากกว่าคนอ่อน (point-biserial-ish, -1..1)
  rd: number               // rating deviation ปัจจุบัน
}

// เงื่อนไข AND (threshold = tune §9)
const TH = { usage: 50, reportRate: 0.05, goodRating: 0.7, discrimination: 0.2, rd: 100 }

export function isPromotable(s: QualityStats): { ok: boolean; reason?: string } {
  if (s.usageCount < TH.usage) return { ok: false, reason: 'usage ไม่พอ' }
  if (s.reportRate >= TH.reportRate) return { ok: false, reason: 'report เยอะ' }
  if (s.goodRatingRatio < TH.goodRating) return { ok: false, reason: 'rating ไม่ดีพอ' }
  if (s.discrimination < TH.discrimination) return { ok: false, reason: 'discrimination ต่ำ' }
  if (s.rd >= TH.rd) return { ok: false, reason: 'RD ยังสูง (ไม่ converge)' }
  return { ok: true }
}
