'use server'
import { createClient } from '@/lib/supabase/server'
import { computeCalibration } from '@/lib/calibration/update'
import { rankToLevel } from '@/lib/practice/serving'
import type { Rating } from '@/lib/calibration/glicko'

function toRating(q: { difficulty_value: number; rating_deviation: number }): Rating {
  return { rating: q.difficulty_value, rd: q.rating_deviation, vol: 0.06 }
}

export async function submitAnswer(input: {
  questionId: string
  subject: string
  topic: string
  correct: boolean
  timeMs: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  // lazy-init user_ratings
  let { data: ur } = await supabase
    .from('user_ratings')
    .select('*')
    .eq('user_id', user.id)
    .eq('subject', input.subject)
    .eq('topic', input.topic)
    .single()
  if (!ur) {
    const ins = await supabase
      .from('user_ratings')
      .insert({ user_id: user.id, subject: input.subject, topic: input.topic })
      .select()
      .single()
    ur = ins.data!
  }

  const { data: q } = await supabase
    .from('questions')
    .select('difficulty_value, rating_deviation, difficulty_frozen')
    .eq('id', input.questionId)
    .single()
  if (!q) return { error: 'question not found' }

  const calc = computeCalibration({
    user: { rating: ur.true_rank, rd: ur.rd, vol: 0.06 },
    question: toRating(q),
    correct: input.correct,
    questionFrozen: q.difficulty_frozen,
    countInCalibration: true,
  })

  await supabase.from('user_attempts').insert({
    user_id: user.id,
    question_id: input.questionId,
    correct: input.correct,
    time_spent_ms: input.timeMs,
    context: 'practice',
  })

  if (calc.user) {
    await supabase
      .from('user_ratings')
      .update({ true_rank: calc.user.rating, rd: calc.user.rd, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('subject', input.subject)
      .eq('topic', input.topic)
  }

  if (calc.question) {
    await supabase
      .from('questions')
      .update({ difficulty_value: calc.question.rating, rating_deviation: calc.question.rd })
      .eq('id', input.questionId)
  }

  await supabase.from('user_question_locks').upsert({
    user_id: user.id,
    question_id: input.questionId,
    lock_until: new Date(Date.now() + 30 * 864e5).toISOString(),
  })

  return { ok: true, newLevel: rankToLevel(calc.user?.rating ?? ur.true_rank) }
}
