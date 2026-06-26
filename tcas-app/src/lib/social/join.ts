import type { SupabaseClient } from '@supabase/supabase-js'

export type JoinResult = { ok: true } | { ok: false; error: string }

// join ห้องด้วย social token: หา room → เช็ค token ≥1 → spend → insert participant
// invariant ทั้งคู่ (room มีจริง + token พอ) บังคับที่เดียว
// ordering: หา room ก่อน spend → พิมพ์ code ผิดแล้วไม่เสีย token (เดิม spend ก่อนเช็ค room)
export async function joinRoomWithToken(
  db: SupabaseClient, userId: string, code: string
): Promise<JoinResult> {
  const { data: room } = await db.from('rooms').select('id').eq('code', code).single()
  if (!room) return { ok: false, error: 'ไม่พบห้อง' }

  const { data: tok } = await db.from('tokens').select('social_balance').eq('user_id', userId).single()
  if ((tok?.social_balance ?? 0) < 1) return { ok: false, error: 'social token ไม่พอ' }

  await db.from('tokens').update({ social_balance: tok!.social_balance - 1 }).eq('user_id', userId)
  await db.from('room_participants').insert({ room_id: room.id, user_id: userId })
  return { ok: true }
}
