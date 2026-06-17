'use server'
import { createClient } from '@/lib/supabase/server'
import { genRoomCode, selectQuestionSet, skillRange, type PoolQ } from '@/lib/social/room'
import { featuresFor } from '@/lib/billing/gating'

export async function createRoom(input: {
  subject: string; topic: string; count: number; timerSec: number; mode: 'wait-all' | 'first-come'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { data: sub } = await supabase.from('subscriptions').select('status,tier').eq('user_id', user.id).single()
  if (!featuresFor(sub!).social) return { error: 'social ไม่พร้อมใช้ (อัปเกรดเพื่อเล่นกับเพื่อน)' }

  const { data: tier } = await supabase.from('skill_tier')
    .select('tier').eq('user_id', user.id).eq('subject', input.subject).eq('topic', input.topic).single()
  const range = skillRange([tier?.tier ?? 3])

  const { data: pool } = await supabase.from('questions')
    .select('id, difficulty_level').eq('subject', input.subject).eq('topic', input.topic)
    .eq('status', 'active') as { data: PoolQ[] | null }
  const set = selectQuestionSet(pool ?? [], range, input.count)

  const code = genRoomCode()
  const { data: room, error } = await supabase.from('rooms').insert({
    code, host_id: user.id, subject: input.subject,
    settings: { topic: input.topic, count: input.count, timerSec: input.timerSec, mode: input.mode },
    question_ids: set.map((q) => q.id),
  }).select().single()
  if (error) return { error: error.message }
  return { ok: true, code: room.code }
}

export async function joinRoom(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const { data: sub } = await supabase.from('subscriptions').select('status,tier').eq('user_id', user.id).single()
  if (!featuresFor(sub!).social) return { error: 'social ไม่พร้อมใช้' }

  const { data: tok } = await supabase.from('tokens').select('social_balance').eq('user_id', user.id).single()
  if ((tok?.social_balance ?? 0) < 1) return { error: 'social token ไม่พอ' }
  await supabase.from('tokens').update({ social_balance: tok!.social_balance - 1 }).eq('user_id', user.id)

  const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single()
  if (!room) return { error: 'ไม่พบห้อง' }
  await supabase.from('room_participants').insert({ room_id: room.id, user_id: user.id })
  return { ok: true }
}

export async function submitSocialAnswer(input: {
  roomId: string; questionId: string; correct: boolean; timeMs: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  // เคยทำโจทย์นี้ recent ไหม → ถ้าเคย ไม่นับ calibration (W5)
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const { count } = await supabase.from('user_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('question_id', input.questionId).gte('created_at', since)
  const countInCalibration = (count ?? 0) === 0

  await supabase.from('user_attempts').insert({
    user_id: user.id, question_id: input.questionId,
    correct: input.correct, time_spent_ms: input.timeMs,
    context: 'social', count_in_calibration: countInCalibration,
  })
  return { ok: true, counted: countInCalibration }
}
