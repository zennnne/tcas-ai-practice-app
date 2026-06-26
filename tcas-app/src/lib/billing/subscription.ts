import type { SupabaseClient } from '@supabase/supabase-js'
import type { SubState, Status, Tier } from './gating'

// authoritative read ของ subscription state — รวม table+column+default ไว้ที่เดียว
// (เดิมกระจายใน withAuth / startCheckout / practice/page) → ไม่มี row = 'free'/'free'
// ทุก caller ตีความ "ไม่มี subscription" เหมือนกัน, ไม่ crash บน .single() เมื่อ row หาย
export async function getSubscription(
  db: SupabaseClient, userId: string
): Promise<SubState> {
  const { data } = await db
    .from('subscriptions').select('status, tier').eq('user_id', userId).maybeSingle()
  return {
    status: (data?.status ?? 'free') as Status,
    tier: (data?.tier ?? 'free') as Tier,
  }
}

export async function isPaidSubscriber(db: SupabaseClient, userId: string): Promise<boolean> {
  return (await getSubscription(db, userId)).status === 'paid'
}
