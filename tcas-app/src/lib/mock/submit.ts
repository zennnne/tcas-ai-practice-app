import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreMock, admitChance, weakTopics, type MockAnswer } from './scoring'
import { recordMockBatch } from '@/lib/attempts/record'

export interface SubmitMockInput {
  userId: string
  answers: (MockAnswer & { questionId: string })[]
}

export interface SubmitMockResult {
  score: number
  weakTopics: string[]
  admitChance: string | null
}

// score → look up goal's faculty cutoff (if any) → record the whole batch (1 Glicko period/topic)
export async function submitMock(
  db: SupabaseClient, input: SubmitMockInput
): Promise<SubmitMockResult> {
  const score = scoreMock(input.answers)
  const weak = weakTopics(input.answers, 0.5)

  const { data: goal } = await db.from('goals').select('target_faculty').eq('user_id', input.userId).single()
  let chance: string | null = null
  if (goal?.target_faculty) {
    const { data: cutoff } = await db.from('faculty_cutoffs')
      .select('min_score, median_score').eq('faculty', goal.target_faculty).single()
    if (cutoff) chance = admitChance(score, cutoff)
  }

  await recordMockBatch(db, {
    userId: input.userId,
    answers: input.answers.map((a) => ({ questionId: a.questionId, correct: a.correct })),
  })
  return { score, weakTopics: weak, admitChance: chance }
}
