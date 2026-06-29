'use server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited } from '@/lib/rate-limit/limiter'
import { buildDefaultStore, type RateLimitStore } from '@/lib/rate-limit/store'

// ---------------------------------------------------------------------------
// IP extraction helper (exported so it can be tested independently)
// ---------------------------------------------------------------------------

/** Extract client IP from Next.js request headers. Uses x-forwarded-for first hop. */
export function getClientIP(hdrs: Headers): string {
  const xff = hdrs.get('x-forwarded-for')
  const first = xff?.split(',')[0]?.trim()
  return first ?? hdrs.get('x-real-ip') ?? '0.0.0.0'
}

// ---------------------------------------------------------------------------
// Per-IP rate limit helper (injectable store for unit tests)
// ---------------------------------------------------------------------------

/** Returns true when the IP is over the auth rate limit. Fail-closed on store error. */
export async function checkIpRateLimit(
  ip: string,
  store: RateLimitStore = buildDefaultStore(),
): Promise<boolean> {
  return isRateLimited(store, ip, 'auth')
}

// ---------------------------------------------------------------------------
// Server actions (minimal edit — only add rate-limit guard at top)
// ---------------------------------------------------------------------------

export async function signup(email: string, password: string) {
  const ip = getClientIP(await headers())
  if (await checkIpRateLimit(ip)) return { error: 'ลองใหม่อีกครั้งภายหลัง' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  const uid = data.user!.id
  await supabase.from('tokens').insert({ user_id: uid })
  await supabase.from('subscriptions').insert({
    user_id: uid, status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  })
  return { ok: true }
}

export async function login(email: string, password: string) {
  const ip = getClientIP(await headers())
  if (await checkIpRateLimit(ip)) return { error: 'ลองใหม่อีกครั้งภายหลัง' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { ok: true }
}
