'use server'
import { createClient } from '@/lib/supabase/server'
import { recordAttempt } from '@/lib/attempts/record'
import { rankToLevel } from '@/lib/practice/serving'

export async function submitAnswer(input: {
  questionId: string
  correct: boolean
  timeMs: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  // practice: นับ calibration เสมอ + lock 30 วัน (subject/topic derive จาก question ใน recordAttempt)
  const { calibration } = await recordAttempt(supabase, {
    userId: user.id,
    questionId: input.questionId,
    correct: input.correct,
    timeMs: input.timeMs,
    context: 'practice',
    countInCalibration: true,
    applyLock: true,
  })

  return { ok: true, newLevel: rankToLevel(calibration.user!.rating) }
}
