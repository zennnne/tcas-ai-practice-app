export interface EligibleQ { id: string; topic: string; mock_eligible: boolean }

export function assembleMock(pool: EligibleQ[], count: number): EligibleQ[] {
  const eligible = pool.filter((q) => q.mock_eligible)
  if (eligible.length < count) throw new Error('โจทย์ 90+ ไม่พอสำหรับ mock')
  // กระจาย topic: round-robin ตาม topic แล้วตัด count
  const byTopic = new Map<string, EligibleQ[]>()
  for (const q of eligible) {
    if (!byTopic.has(q.topic)) byTopic.set(q.topic, [])
    byTopic.get(q.topic)!.push(q)
  }
  const result: EligibleQ[] = []
  const topics = [...byTopic.keys()]
  let i = 0
  while (result.length < count) {
    const t = topics[i % topics.length]
    const bucket = byTopic.get(t)!
    if (bucket.length) result.push(bucket.shift()!)
    i++
  }
  return result
}
