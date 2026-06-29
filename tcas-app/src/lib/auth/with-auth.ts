import { createClient } from '@/lib/supabase/server'
import { featuresFor, type Features } from '@/lib/billing/gating'
import { getSubscription } from '@/lib/billing/subscription'
import { isRateLimited, type RateLimitClass } from '@/lib/rate-limit/limiter'
import { buildDefaultStore, type RateLimitStore } from '@/lib/rate-limit/store'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
export type AuthCtx = { userId: string; supabase: SupabaseClient }

const FEATURE_DENIED: Record<keyof Features, string> = {
  practice: 'ฟีเจอร์นี้เฉพาะสมาชิก',
  showRank: 'การดูอันดับเฉพาะสมาชิก Premium',
  mock: 'mock เฉพาะสมาชิก Premium (อัปเกรด)',
  social: 'social เฉพาะสมาชิก Premium (อัปเกรด)',
  socialToken: 'social token เฉพาะสมาชิก Premium',
}

export interface WithAuthOptions {
  /**
   * Cost class for per-user rate limiting.
   * Defaults to 'action' — all authenticated calls are rate-limited.
   * Pass 'read' for cheap reads, 'ai' for expensive AI-backed operations.
   */
  rateLimit?: RateLimitClass
  /**
   * Override the rate-limit store. Intended for unit tests only (inject FakeStore).
   * Prefix underscore signals test-only usage.
   */
  _store?: RateLimitStore
}

/**
 * Authenticated server-action wrapper.
 *
 * Checks (in order):
 *   1. Authentication (valid session)
 *   2. Per-user rate limit (keyed by userId + cost class)
 *   3. Feature gate (subscription tier check)
 *
 * Returns a discriminated union: `{ ok: false, error }` on any failure, or the
 * result of `fn` on success.
 *
 * The third `options` parameter is optional — existing callers need no changes.
 */
export async function withAuth<T>(
  feature: keyof Features | null,
  fn: (ctx: AuthCtx) => Promise<T>,
  options?: WithAuthOptions,
): Promise<T | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'unauthorized' }

  // Per-user rate limit — defaults to 'action' class (30 req/min)
  const cls = options?.rateLimit ?? 'action'
  const store = options?._store ?? buildDefaultStore()
  if (await isRateLimited(store, user.id, cls)) {
    return { ok: false as const, error: 'ลองใหม่อีกครั้งภายหลัง' }
  }

  if (feature !== null) {
    const sub = await getSubscription(supabase, user.id)
    if (!featuresFor(sub)[feature]) {
      return { ok: false as const, error: FEATURE_DENIED[feature] }
    }
  }

  return fn({ userId: user.id, supabase })
}
