'use server'
import { createClient } from '@/lib/supabase/server'
import { featuresFor } from '@/lib/billing/gating'
import { assembleMock } from '@/lib/mock/assembly'
import { scoreMock, admitChance, weakTopics } from '@/lib/mock/scoring'

export async function setGoal(targetFaculty: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }
  await supabase.from('goals').upsert({
    user_id: user.id, target_faculty: targetFaculty, updated_at: new Date().toISOString(),
  })
  return { ok: true }
}

export async function startMock(subject: string, count: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }
  const { data: sub } = await supabase.from('subscriptions').select('status,tier').eq('user_id', user.id).single()
  if (!featuresFor(sub!).mock) return { error: 'mock เฉพาะสมาชิก (อัปเกรด)' }

  const { data: pool } = await supabase.from('questions')
    .select('id, topic, mock_eligible').eq('subject', subject).eq('mock_eligible', true).eq('status', 'active')
  const set = assembleMock((pool ?? []).map((q) => ({ ...q, mock_eligible: true })), count)
  return { ok: true, questionIds: set.map((q) => q.id) }
}

export async function submitMock(input: {
  subject: string; answers: { topic: string; questionId: string; correct: boolean }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const score = scoreMock(input.answers)
  const weak = weakTopics(input.answers, 0.5)

  // โอกาสติดเทียบคณะเป้าหมาย
  const { data: goal } = await supabase.from('goals').select('target_faculty').eq('user_id', user.id).single()
  let chance: string | null = null
  if (goal?.target_faculty) {
    const { data: cutoff } = await supabase.from('faculty_cutoffs')
      .select('min_score, median_score').eq('faculty', goal.target_faculty).single()
    if (cutoff) chance = admitChance(score, cutoff)
  }

  // บันทึก attempts (context=mock) + ขยับ true_rank น้ำหนักสูง (mock = ตัวขยับหลัก §5.2)
  for (const a of input.answers) {
    await supabase.from('user_attempts').insert({
      user_id: user.id, question_id: a.questionId, correct: a.correct,
      context: 'mock', count_in_calibration: true,
    })
  }
  return { ok: true, score, weakTopics: weak, admitChance: chance }
}
