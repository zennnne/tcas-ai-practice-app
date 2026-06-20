'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { assembleMock } from '@/lib/mock/assembly'
import { scoreMock, admitChance, weakTopics } from '@/lib/mock/scoring'
import { recordMockBatch } from '@/lib/attempts/record'

export async function setGoal(targetFaculty: string) {
  return withAuth(null, async ({ userId, supabase }) => {
    await supabase.from('goals').upsert({
      user_id: userId, target_faculty: targetFaculty, updated_at: new Date().toISOString(),
    })
    return { ok: true as const }
  })
}

export async function startMock(subject: string, count: number) {
  return withAuth('mock', async ({ supabase }) => {
    const { data: pool } = await supabase.from('questions')
      .select('id, topic, mock_eligible').eq('subject', subject).eq('mock_eligible', true).eq('status', 'active')
    const set = assembleMock((pool ?? []).map((q) => ({ ...q, mock_eligible: true })), count)
    return { ok: true as const, questionIds: set.map((q) => q.id) }
  })
}

export async function submitMock(input: {
  subject: string; answers: { topic: string; questionId: string; correct: boolean }[]
}) {
  return withAuth(null, async ({ userId, supabase }) => {
    const score = scoreMock(input.answers)
    const weak = weakTopics(input.answers, 0.5)

    const { data: goal } = await supabase.from('goals').select('target_faculty').eq('user_id', userId).single()
    let chance: string | null = null
    if (goal?.target_faculty) {
      const { data: cutoff } = await supabase.from('faculty_cutoffs')
        .select('min_score, median_score').eq('faculty', goal.target_faculty).single()
      if (cutoff) chance = admitChance(score, cutoff)
    }

    await recordMockBatch(supabase, {
      userId,
      answers: input.answers.map((a) => ({ questionId: a.questionId, correct: a.correct })),
    })
    return { ok: true as const, score, weakTopics: weak, admitChance: chance }
  })
}
