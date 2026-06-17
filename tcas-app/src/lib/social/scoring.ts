export interface Answer { qIndex: number; correct: boolean; timeMs: number }
export interface Standing { userId: string; correct: number; avgMs: number }

export function scoreParticipant(answers: Answer[]): { correct: number; avgMs: number } {
  const correct = answers.filter((a) => a.correct).length
  const avgMs = answers.length ? answers.reduce((s, a) => s + a.timeMs, 0) / answers.length : 0
  return { correct, avgMs }
}

export function leaderboard(standings: Standing[]): Standing[] {
  return [...standings].sort((a, b) => b.correct - a.correct || a.avgMs - b.avgMs)
}

export function hardestQuestion(allAnswers: { qIndex: number; correct: boolean }[][]): number {
  const wrong = new Map<number, number>()
  for (const participant of allAnswers)
    for (const a of participant)
      if (!a.correct) wrong.set(a.qIndex, (wrong.get(a.qIndex) ?? 0) + 1)
  let worst = -1, max = -1
  for (const [q, n] of wrong) if (n > max) { max = n; worst = q }
  return worst
}
