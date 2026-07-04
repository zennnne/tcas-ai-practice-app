import type { SupabaseClient } from '@supabase/supabase-js'
import { genRoomCode, selectQuestionSet, skillRange, type PoolQ } from './room'

export interface CreateRoomInput {
  userId: string
  subject: string
  topic: string
  count: number
  timerSec: number
  mode: 'wait-all' | 'first-come'
}

export type CreateRoomResult = { ok: true; code: string } | { ok: false; error: string }

// host's skill_tier (default 3 ถ้ายังไม่มี calibration) → question set in range → insert room
export async function createRoom(
  db: SupabaseClient, input: CreateRoomInput
): Promise<CreateRoomResult> {
  const { data: tier } = await db.from('skill_tier')
    .select('tier').eq('user_id', input.userId).eq('subject', input.subject).eq('topic', input.topic).single()
  const range = skillRange([tier?.tier ?? 3])

  const { data: pool } = await db.from('questions')
    .select('id, difficulty_level').eq('subject', input.subject).eq('topic', input.topic)
    .eq('status', 'active') as { data: PoolQ[] | null }
  const set = selectQuestionSet(pool ?? [], range, input.count)

  const code = genRoomCode()
  const { data: room, error } = await db.from('rooms').insert({
    code, host_id: input.userId, subject: input.subject,
    settings: { topic: input.topic, count: input.count, timerSec: input.timerSec, mode: input.mode },
    question_ids: set.map((q) => q.id),
  }).select().single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, code: room.code }
}
