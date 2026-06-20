'use server'
import { withAuth } from '@/lib/auth/with-auth'
import { genRoomCode, selectQuestionSet, skillRange, type PoolQ } from '@/lib/social/room'
import { recordAttempt } from '@/lib/attempts/record'

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
  return withAuth('social', async ({ userId, supabase }) => {
    const { data: tok } = await supabase.from('tokens').select('social_balance').eq('user_id', userId).single()
    if ((tok?.social_balance ?? 0) < 1) return { ok: false as const, error: 'social token ไม่พอ' }
    await supabase.from('tokens').update({ social_balance: tok!.social_balance - 1 }).eq('user_id', userId)

    const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single()
    if (!room) return { ok: false as const, error: 'ไม่พบห้อง' }
    await supabase.from('room_participants').insert({ room_id: room.id, user_id: userId })
    return { ok: true as const }
  })
}

export async function submitSocialAnswer(input: {
  roomId: string; questionId: string; correct: boolean; timeMs: number
}) {
  return withAuth(null, async ({ userId, supabase }) => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const { count } = await supabase.from('user_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('question_id', input.questionId).gte('created_at', since)
    const countInCalibration = (count ?? 0) === 0

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
