export interface CardInput { results: boolean[]; rank: number; total: number; subject: string }

// Wordle-style: emoji grid (แชร์เป็น text ได้เลย; รูปภาพ = render canvas จาก text นี้)
export function buildShareCard(i: CardInput): string {
  const grid = i.results.map((r) => (r ? '🟩' : '🟥')).join('')
  return `TCAS ${i.subject} 🏆 อันดับ ${i.rank}/${i.total}\n${grid}\nมาแข่งกัน!`
}
