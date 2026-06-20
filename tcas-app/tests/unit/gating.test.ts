import { describe, it, expect } from 'vitest'
import { featuresFor, isPremium, type SubState } from '@/lib/billing/gating'

describe('featuresFor', () => {
  it('free: practice only, rank hidden, no mock/social', () => {
    const f = featuresFor({ status: 'free', tier: 'free' })
    expect(f.practice).toBe(true)
    expect(f.showRank).toBe(false)
    expect(f.mock).toBe(false)
    expect(f.social).toBe(false)
  })
  it('trial: everything on', () => {
    const f = featuresFor({ status: 'trial', tier: 'free' })
    expect(f).toMatchObject({ practice: true, showRank: true, mock: true, social: true })
  })
  it('paid tier2: everything on', () => {
    const f = featuresFor({ status: 'paid', tier: 'tier2' })
    expect(f).toMatchObject({ practice: true, showRank: true, mock: true, social: true })
  })
  it('trial_expired_free behaves like free', () => {
    const f = featuresFor({ status: 'trial_expired_free', tier: 'free' })
    expect(f.social).toBe(false)
    expect(f.showRank).toBe(false)
  })
})

describe('isPremium', () => {
  it('trial + paid = premium', () => {
    expect(isPremium('trial')).toBe(true)
    expect(isPremium('paid')).toBe(true)
  })
  it('free + trial_expired_free = not premium', () => {
    expect(isPremium('free')).toBe(false)
    expect(isPremium('trial_expired_free')).toBe(false)
  })
})
