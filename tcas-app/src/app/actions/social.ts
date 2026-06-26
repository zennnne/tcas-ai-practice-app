'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { genRoomCode, selectQuestionSet, skillRange, type PoolQ } from '@/lib/social/room'
import { joinRoomWithToken } from '@/lib/social/join'
import { recordAttempt, hasRecentAttempt } from '@/lib/attempts/record'

export async function createRoom(input: {
  subject: string; topic: string; count: number; timerSec: number; mode: 'wait-all' | 'first-come'
}) {
  return withAuth('social', async ({ userId, supabase }) => {
    const { data: tier } = await supabase.from('skill_tier')
      .select('tier').eq('user_id', userId).eq('subject', input.subject).eq('topic', input.topic).single()
    const range = skillRange([tier?.tier ?? 3])

    const { data: pool } = await supabase.from('questions')
      .select('id, difficulty_level').eq('subject', input.subject).eq('topic', input.topic)
      .eq('status', 'active') as { data: PoolQ[] | null }
    const set = selectQuestionSet(pool ?? [], range, input.count)

    const code = genRoomCode()
    const { data: room, error } = await supabase.from('rooms').insert({
      code, host_id: userId, subject: input.subject,
      settings: { topic: input.topic, count: input.count, timerSec: input.timerSec, mode: input.mode },
      question_ids: set.map((q) => q.id),
    }).select().single()
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, code: room.code }
  })
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
