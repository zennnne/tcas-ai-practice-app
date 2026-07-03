/** Shared store interface for rate-limit / usage counters. */
export interface RateLimitStore {
  /**
   * Atomically increment a key by `amount` (default 1) and return the new count.
   * Sets TTL (seconds) on the first write; subsequent calls may extend or leave TTL unchanged.
   */
  increment(key: string, ttlSeconds: number, amount?: number): Promise<number>
}

// ---------------------------------------------------------------------------
// Upstash Redis (REST) implementation
// ---------------------------------------------------------------------------

/**
 * Upstash Redis store backed by the REST HTTP API.
 * Uses a two-command pipeline: INCRBY + EXPIRE (resets TTL each call — acceptable
 * because the caller embeds the window number in the key). INCRBY with amount=1
 * behaves identically to INCR.
 */
export class UpstashStore implements RateLimitStore {
  constructor(private readonly url: string, private readonly token: string) {}

  async increment(key: string, ttlSeconds: number, amount = 1): Promise<number> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCRBY', key, String(amount)],
        ['EXPIRE', key, String(ttlSeconds)],
      ]),
    })
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`)
    const data = (await res.json()) as Array<{ result: number }>
    return data[0].result
  }
}

// ---------------------------------------------------------------------------
// In-memory fake store (tests only)
// ---------------------------------------------------------------------------

/** Thread-unsafe in-memory store — suitable for sequential Vitest runs only. */
export class FakeStore implements RateLimitStore {
  private readonly m = new Map<string, { count: number; exp: number }>()

  async increment(key: string, ttlSeconds: number, amount = 1): Promise<number> {
    const now = Date.now()
    const entry = this.m.get(key)
    if (!entry || entry.exp <= now) {
      this.m.set(key, { count: amount, exp: now + ttlSeconds * 1000 })
      return amount
    }
    entry.count += amount
    return entry.count
  }

  /** Clear all counters between tests. */
  reset(): void {
    this.m.clear()
  }
}

// ---------------------------------------------------------------------------
// Default store factory
// ---------------------------------------------------------------------------

/**
 * Build a store from environment variables.
 * Falls back to a no-op store (always returns 0) when Upstash env vars are absent —
 * rate limiting is silently skipped in local dev without Redis.
 *
 * Human TODO: create an Upstash Redis database, copy REST URL + token into env.
 */
export function buildDefaultStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new UpstashStore(url, token)
  // No-op: rate limiting disabled when Redis is not configured
  return { increment: async () => 0 }
}
