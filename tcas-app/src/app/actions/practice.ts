'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { recordAttempt } from '@/lib/attempts/record'
import { rankToLevel } from '@/lib/practice/serving'

export async function submitAnswer(input: {
  questionId: string
  correct: boolean
  timeMs: number
}) {
  return withAuth(null, async ({ userId, supabase }) => {
    const { calibration } = await recordAttempt(supabase, {
      userId,
      questionId: input.questionId,
      correct: input.correct,
      timeMs: input.timeMs,
      context: 'practice',
      countInCalibration: true,
      applyLock: true,
    })
    return { ok: true as const, newLevel: rankToLevel(calibration.user!.rating) }
  })
}
