export interface MockAnswer { topic: string; correct: boolean }
export interface Cutoff { min_score: number; median_score: number }

export function scoreMock(answers: MockAnswer[]): number {
  if (!answers.length) return 0
  return (answers.filter((a) => a.correct).length / answers.length) * 100
}

export function admitChance(score: number, c: Cutoff): 'สูง' | 'ปานกลาง' | 'ต่ำ' {
  if (score >= c.median_score) return 'สูง'
  if (score >= c.min_score) return 'ปานกลาง'
  return 'ต่ำ'
}

export function weakTopics(answers: MockAnswer[], threshold: number): string[] {
  const byTopic = new Map<string, { correct: number; total: number }>()
  for (const a of answers) {
    const t = byTopic.get(a.topic) ?? { correct: 0, total: 0 }
    t.total++; if (a.correct) t.correct++
    byTopic.set(a.topic, t)
  }
  return [...byTopic.entries()]
    .filter(([, v]) => v.correct / v.total < threshold)
    .map(([t]) => t)
}
