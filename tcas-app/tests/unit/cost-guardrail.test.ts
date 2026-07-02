import { describe, it, expect, beforeEach } from 'vitest'
import { FakeStore } from '@/lib/rate-limit/store'
import { checkAndRecordSpend, getSpendCaps } from '@/lib/cost-guardrail/guardrail'

describe('checkAndRecordSpend', () => {
  const store = new FakeStore()
  let alerts: Array<{ message: string; context?: Record<string, unknown> }>

  function fakeAlerter(message: string, context?: Record<string, unknown>): void {
    alerts.push({ message, context })
  }

  beforeEach(() => {
    store.reset()
    alerts = []
  })

  it('under soft cap → allow, no alert', async () => {
    const allowed = await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    expect(allowed).toBe(true)
    expect(alerts).toHaveLength(0)
  })

  it('crossing soft cap → allow + alert fired', async () => {
    const { softCap } = getSpendCaps('ai_call')
    for (let i = 0; i < softCap; i++) {
      await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    }
    expect(alerts).toHaveLength(0) // exactly at soft cap — not yet crossed

    const allowed = await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    expect(allowed).toBe(true)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].message).toContain('soft cap')
    expect(alerts[0].context).toMatchObject({ kind: 'ai_call' })
  })

  it('crossing hard cap → deny', async () => {
    const { hardCap } = getSpendCaps('ai_call')
    let lastAllowed = true
    for (let i = 0; i < hardCap; i++) {
      lastAllowed = await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    }
    // exactly at hard cap (count === hardCap) is still allowed — over-cap is what denies
    expect(lastAllowed).toBe(true)

    const allowed = await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    expect(allowed).toBe(false)
  })

  it('a single call whose units jump past the hard cap is denied immediately', async () => {
    const { hardCap } = getSpendCaps('ai_tokens')
    const allowed = await checkAndRecordSpend('ai_tokens', hardCap + 1, store, fakeAlerter)
    expect(allowed).toBe(false)
  })

  it('different kinds have independent counters', async () => {
    const { hardCap } = getSpendCaps('ai_call')
    for (let i = 0; i <= hardCap; i++) {
      await checkAndRecordSpend('ai_call', 1, store, fakeAlerter)
    }
    // ai_tokens counter is untouched — a small amount is still allowed
    const allowed = await checkAndRecordSpend('ai_tokens', 1, store, fakeAlerter)
    expect(allowed).toBe(true)
  })

  it('store error fails open (allow, no alert)', async () => {
    const brokenStore = {
      increment: async () => {
        throw new Error('redis down')
      },
    }
    const allowed = await checkAndRecordSpend('ai_call', 1, brokenStore, fakeAlerter)
    expect(allowed).toBe(true)
    expect(alerts).toHaveLength(0)
  })
})
