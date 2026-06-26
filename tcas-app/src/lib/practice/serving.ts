import type { SupabaseClient } from '@supabase/supabase-js'

// true_rank (Glicko ~1500 center) → level 1-5
export function rankToLevel(rank: number): number {
  const lvl = Math.round((rank - 1500) / 200) + 3
  return Math.min(5, Math.max(1, lvl))
}

export interface SessionState { streak: number; lastCorrect: boolean }

// serving difficulty layer (เร็ว): ถูก → +1, ผิด → -1, clamp 1-5
export function nextServingLevel(current: number, s: SessionState): number {
  const delta = s.lastCorrect ? 1 : -1
  return Math.min(5, Math.max(1, current + delta))
}

// ดึงโจทย์ถัดไป: 2-step — fetch locked IDs ก่อน แล้วค่อย exclude
// (PostgREST ไม่รัน subquery ใน .not('id','in',...))
// db inject (เหมือน recordAttempt) → testable + compose client เดียวกับ caller ได้
export async function pickQuestion(
  db: SupabaseClient, userId: string, subject: string, topic: string, level: number
) {
  // step 1: หา locked question IDs สำหรับ user นี้
  const { data: locks } = await db
    .from('user_question_locks')
    .select('question_id')
    .eq('user_id', userId)
    .gt('lock_until', new Date().toISOString())

  const lockedIds = (locks ?? []).map((l) => l.question_id)

  // step 2: ดึงโจทย์จาก pool ตัด locked
  let query = db
    .from('questions')
    .select('id, body, difficulty_value, rating_deviation, difficulty_frozen')
    .eq('subject', subject)
    .eq('topic', topic)
    .eq('difficulty_level', level)
    .eq('status', 'active')
    .limit(1)

  if (lockedIds.length > 0) {
    query = query.not('id', 'in', `(${lockedIds.join(',')})`)
  }

  const { data } = await query
  return data?.[0] ?? null // null → caller เรียก escape-hatch check (P1)
}
