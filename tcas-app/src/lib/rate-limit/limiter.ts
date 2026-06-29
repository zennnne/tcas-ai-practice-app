import type { RateLimitStore } from './store'

// ---------------------------------------------------------------------------
// Cost classes
// ---------------------------------------------------------------------------

export type RateLimitClass = 'read' | 'action' | 'ai' | 'auth'

interface ClassConfig {
  /** Sliding-window duration in ms. */
  windowMs: number
  /** Max requests allowed per window. */
  limit: number
  /**
   * What to do when the store throws an error.
   * true  = fail-open  (allow the request — prefer availability)
   * false = fail-closed (deny the request — prefer safety)
   */
  failOpen: boolean
}

const CONFIGS: Record<RateLimitClass, ClassConfig> = {
  // Generic reads: generous ceiling, fail-open
  read: { windowMs: 60_000, limit: 120, failOpen: true },
  // Authenticated mutations: moderate ceiling, fail-open
  action: { windowMs: 60_000, limit: 30, failOpen: true },
  // AI-heavy operations (question generation, etc.): tight ceiling, fail-open
  ai: { windowMs: 60_000, limit: 10, failOpen: true },
  // Login / signup: strict ceiling, fail-closed (safety > availability at auth)
  auth: { windowMs: 15 * 60_000, limit: 10, failOpen: false },
}

// ---------------------------------------------------------------------------
// isRateLimited
// ---------------------------------------------------------------------------

/**
 * Check whether `key` has exceeded the rate limit for class `cls`.
 *
 * Uses a **fixed-window** algorithm: the window number is embedded in the
 * store key so each window is independent. The store only needs INCR + TTL.
 *
 * @param store  Injectable store (use FakeStore in tests, UpstashStore in prod)
 * @param key    Unique identifier — userId for withAuth, IP for auth actions
 * @param cls    Cost class that determines window size and limit
 * @returns      true if the caller is over the limit (request should be rejected)
 */
export async function isRateLimited(
  store: RateLimitStore,
  key: string,
  cls: RateLimitClass,
): Promise<boolean> {
  const { windowMs, limit, failOpen } = CONFIGS[cls]
  const windowNum = Math.floor(Date.now() / windowMs)
  // Key encodes: class + caller identity + window → each window is a fresh counter
  const storeKey = `rl:${cls}:${key}:${windowNum}`
  // TTL: keep the key alive for the remainder of the window + a 60-second buffer
  const ttlSeconds = Math.ceil(windowMs / 1000) + 60

  try {
    const count = await store.increment(storeKey, ttlSeconds)
    return count > limit
  } catch {
    // Store error: honour fail-open / fail-closed policy
    return !failOpen
  }
}

// Re-export configs for tests that need to inspect thresholds
export { CONFIGS as RATE_LIMIT_CONFIGS }
