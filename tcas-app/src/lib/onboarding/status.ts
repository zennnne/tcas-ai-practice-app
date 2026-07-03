import type { SupabaseClient } from '@supabase/supabase-js'

export type AttemptContext = 'practice' | 'social' | 'mock'

// "onboarding เสร็จ" ไม่ต้องมี flag แยก — derive จาก user_attempts ที่มีอยู่แล้ว (context ตรงกับหน้า)
// เคยมี attempt >=1 ครั้ง = เคยทำกิจกรรมนั้นแล้ว → ไม่ใช่ครั้งแรก, ไม่มีทาง "ย้อนกลับ" เพราะ attempts สะสมตลอด (issue #12 story 5)
export function isFirstVisit(attemptCount: number): boolean {
  return attemptCount <= 0
}

// thin DB wrapper — RLS ("own attempts") กรองแถวของ user นั้นอยู่แล้ว, .eq(user_id) กันไว้อีกชั้นเวลาเรียกฝั่ง server ที่รู้ userId
export async function countAttempts(
  db: SupabaseClient, userId: string, context: AttemptContext
): Promise<number> {
  const { count } = await db
    .from('user_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('context', context)
  return count ?? 0
}
