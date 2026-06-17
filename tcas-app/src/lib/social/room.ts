export function genRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function skillRange(levels: number[]): { min: number; max: number } {
  return { min: Math.min(...levels), max: Math.max(...levels) }
}

export interface PoolQ { id: string; difficulty_level: number }

// §6.2: สุ่ม 100% จาก range, ไม่สน lock (ไม่กรอง attempted/lock)
export function selectQuestionSet(
  pool: PoolQ[], range: { min: number; max: number }, count: number
): PoolQ[] {
  const inRange = pool.filter((q) => q.difficulty_level >= range.min && q.difficulty_level <= range.max)
  for (let i = inRange.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[inRange[i], inRange[j]] = [inRange[j], inRange[i]]
  }
  return inRange.slice(0, count)
}
