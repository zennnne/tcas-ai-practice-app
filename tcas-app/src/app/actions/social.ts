'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { createRoom as createRoomOrchestration } from '@/lib/social/create-room'
import { joinRoomWithToken } from '@/lib/social/join'
import { recordAttempt, hasRecentAttempt } from '@/lib/attempts/record'

export async function createRoom(input: {
  subject: string; topic: string; count: number; timerSec: number; mode: 'wait-all' | 'first-come'
}) {
  return withAuth('social', ({ userId, supabase }) =>
    createRoomOrchestration(supabase, { userId, ...input }))
}

export async function joinRoom(code: string) {
  return withAuth('social', ({ userId, supabase }) => joinRoomWithToken(supabase, userId, code))
}

export async function submitSocialAnswer(input: {
  roomId: string; questionId: string; correct: boolean; timeMs: number
}) {
  return withAuth(null, async ({ userId, supabase }) => {
    const countInCalibration = !(await hasRecentAttempt(supabase, userId, input.questionId))

    await recordAttempt(supabase, {
      userId,
      questionId: input.questionId,
      correct: input.correct,
      timeMs: input.timeMs,
      context: 'social',
      countInCalibration,
      applyLock: false,
    })
    return { ok: true as const, counted: countInCalibration }
  })
}
