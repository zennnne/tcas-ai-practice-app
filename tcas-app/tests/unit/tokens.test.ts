import { describe, it, expect } from 'vitest'
import { grantDaily, transferSocialToPractice } from '@/lib/tokens/tokens'

describe('token logic', () => {
  it('grant adds daily allotment but caps at 7-day worth (tier2 practice)', () => {
    const r = grantDaily({ practice: 20, social: 0 }, 'tier2')
    expect(r.practice).toBe(21) // 20+3=23 → cap 21
  })

  it('grant below cap adds normally', () => {
    const r = grantDaily({ practice: 5, social: 0 }, 'tier2')
    expect(r.practice).toBe(8) // 5+3
  })

  it('transfer social→practice at 1:0.5', () => {
    const r = transferSocialToPractice({ practice: 0, social: 4 }, 4)
    expect(r.social).toBe(0)
    expect(r.practice).toBe(2) // 4 × 0.5
  })

  it('transfer respects practice cap', () => {
    const r = transferSocialToPractice({ practice: 20, social: 4 }, 4, 'tier2')
    expect(r.practice).toBe(21)
  })

  it('cannot transfer more social than owned', () => {
    expect(() => transferSocialToPractice({ practice: 0, social: 1 }, 5)).toThrow()
  })
})
