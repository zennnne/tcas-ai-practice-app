export interface ReporterHistory { confirmed: number; rejected: number }

// น้ำหนัก = 0.5 + accuracy (clamp 0..2). user ใหม่ = 1.0
export function reportWeight(h: ReporterHistory): number {
  const total = h.confirmed + h.rejected
  if (total === 0) return 1.0
  const accuracy = h.confirmed / total // 0..1
  return Math.max(0, Math.min(2, 0.5 + accuracy * 1.5))
}
