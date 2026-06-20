import { createClient } from '@/lib/supabase/server'
import { featuresFor, type Features } from '@/lib/billing/gating'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
export type AuthCtx = { userId: string; supabase: SupabaseClient }

const FEATURE_DENIED: Record<keyof Features, string> = {
  practice: 'ฟีเจอร์นี้เฉพาะสมาชิก',
  showRank: 'การดูอันดับเฉพาะสมาชิก Premium',
  mock: 'mock เฉพาะสมาชิก Premium (อัปเกรด)',
  social: 'social เฉพาะสมาชิก Premium (อัปเกรด)',
  socialToken: 'social token เฉพาะสมาชิก Premium',
}

export async function withAuth<T>(
  feature: keyof Features | null,
  fn: (ctx: AuthCtx) => Promise<T>
): Promise<T | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'unauthorized' }

  if (feature !== null) {
    const { data: sub } = await supabase
      .from('subscriptions').select('status,tier').eq('user_id', user.id).single()
    if (!featuresFor(sub!)[feature]) {
      return { ok: false as const, error: FEATURE_DENIED[feature] }
    }
  }

  return fn({ userId: user.id, supabase })
}
