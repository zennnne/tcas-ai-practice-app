import { isRateLimited } from './limiter'
import { buildDefaultStore, type RateLimitStore } from './store'

/** Extract client IP from Next.js request headers. Uses x-forwarded-for first hop. */
export function getClientIP(hdrs: Headers): string {
  const xff = hdrs.get('x-forwarded-for')
  const first = xff?.split(',')[0]?.trim()
  return first ?? hdrs.get('x-real-ip') ?? '0.0.0.0'
}

/** Returns true when the IP is over the auth rate limit. Fail-closed on store error. */
export async function checkIpRateLimit(
  ip: string,
  store: RateLimitStore = buildDefaultStore(),
): Promise<boolean> {
  return isRateLimited(store, ip, 'auth')
}
