import { describe, it, expect, beforeEach } from 'vitest'
import { FakeStore } from '@/lib/rate-limit/store'
import { isRateLimited, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit/limiter'
import { getClientIP, checkIpRateLimit } from '@/lib/rate-limit/ip'

// ---------------------------------------------------------------------------
// FakeStore unit tests
// ---------------------------------------------------------------------------

describe('FakeStore', () => {
  const store = new FakeStore()

  beforeEach(() => store.reset())

  it('increments from 1 on first call', async () => {
    expect(await store.increment('k', 60)).toBe(1)
  })

  it('increments monotonically within TTL', async () => {
    await store.increment('k', 60)
    await store.increment('k', 60)
    expect(await store.increment('k', 60)).toBe(3)
  })

  it('different keys are independent', async () => {
    await store.increment('a', 60)
    await store.increment('a', 60)
    expect(await store.increment('b', 60)).toBe(1)
  })

  it('expired entry restarts at 1', async () => {
    // Use a tiny TTL (expires immediately in the past by manipulating via a fresh key)
    const key = `exp-${Date.now()}`
    // Simulate an already-expired entry by setting exp in the past
    // We can't do that directly, but we can use ttlSeconds=0 and wait a ms
    await store.increment(key, 0) // exp = now + 0ms → already expired
    // Tiny yield for the test runner
    await new Promise((r) => setTimeout(r, 5))
    expect(await store.increment(key, 60)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// isRateLimited — core behaviour
// ---------------------------------------------------------------------------

describe('isRateLimited', () => {
  const store = new FakeStore()

  beforeEach(() => store.reset())

  it('under limit → not limited', async () => {
    const limit = RATE_LIMIT_CONFIGS.action.limit
    for (let i = 0; i < limit; i++) {
      expect(await isRateLimited(store, 'user1', 'action')).toBe(false)
    }
  })

  it('one over limit → limited', async () => {
    const limit = RATE_LIMIT_CONFIGS.action.limit
    for (let i = 0; i < limit; i++) {
      await isRateLimited(store, 'user1', 'action')
    }
    // Next call is the (limit+1)th → should be limited
    expect(await isRateLimited(store, 'user1', 'action')).toBe(true)
  })

  it('different user keys do not interfere', async () => {
    const limit = RATE_LIMIT_CONFIGS.action.limit
    for (let i = 0; i < limit + 1; i++) {
      await isRateLimited(store, 'user1', 'action')
    }
    // user2 has a fresh counter — should not be limited
    expect(await isRateLimited(store, 'user2', 'action')).toBe(false)
  })

  it('different classes have independent counters', async () => {
    const actionLimit = RATE_LIMIT_CONFIGS.action.limit
    for (let i = 0; i < actionLimit + 1; i++) {
      await isRateLimited(store, 'user1', 'action')
    }
    // 'ai' class has a separate key → not limited yet
    expect(await isRateLimited(store, 'user1', 'ai')).toBe(false)
  })

  it('fail-open on store error (action class)', async () => {
    const brokenStore = { increment: async () => { throw new Error('redis down') } }
    // action.failOpen = true → should NOT be limited when store errors
    expect(await isRateLimited(brokenStore, 'user1', 'action')).toBe(false)
  })

  it('fail-closed on store error (auth class)', async () => {
    const brokenStore = { increment: async () => { throw new Error('redis down') } }
    // auth.failOpen = false → SHOULD be limited when store errors
    expect(await isRateLimited(brokenStore, '1.2.3.4', 'auth')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getClientIP
// ---------------------------------------------------------------------------

describe('getClientIP', () => {
  function makeHeaders(entries: Record<string, string>): Headers {
    return new Headers(entries)
  }

  it('returns first x-forwarded-for hop', () => {
    const hdrs = makeHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIP(hdrs)).toBe('1.2.3.4')
  })

  it('trims whitespace', () => {
    const hdrs = makeHeaders({ 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' })
    expect(getClientIP(hdrs)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when xff absent', () => {
    const hdrs = makeHeaders({ 'x-real-ip': '9.9.9.9' })
    expect(getClientIP(hdrs)).toBe('9.9.9.9')
  })

  it('returns 0.0.0.0 when no header present', () => {
    expect(getClientIP(new Headers())).toBe('0.0.0.0')
  })
})

// ---------------------------------------------------------------------------
// checkIpRateLimit — per-IP auth guard
// ---------------------------------------------------------------------------

describe('checkIpRateLimit', () => {
  const store = new FakeStore()

  beforeEach(() => store.reset())

  it('allows requests under auth limit', async () => {
    expect(await checkIpRateLimit('1.2.3.4', store)).toBe(false)
  })

  it('denies requests over auth limit', async () => {
    const limit = RATE_LIMIT_CONFIGS.auth.limit
    for (let i = 0; i < limit; i++) {
      await checkIpRateLimit('1.2.3.4', store)
    }
    expect(await checkIpRateLimit('1.2.3.4', store)).toBe(true)
  })

  it('different IPs are independent', async () => {
    const limit = RATE_LIMIT_CONFIGS.auth.limit
    for (let i = 0; i < limit + 1; i++) {
      await checkIpRateLimit('1.2.3.4', store)
    }
    // Different IP: fresh counter, should not be limited
    expect(await checkIpRateLimit('5.6.7.8', store)).toBe(false)
  })
})
