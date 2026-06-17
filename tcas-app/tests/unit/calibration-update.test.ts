import { describe, it, expect } from 'vitest'
import { computeCalibration, shouldUnfreeze, type AttemptInput } from '@/lib/calibration/update'

const base: AttemptInput = {
  user: { rating: 1500, rd: 200, vol: 0.06 },
  question: { rating: 1700, rd: 100, vol: 0.06 },
  correct: true,
  questionFrozen: true,
  countInCalibration: true,
}

describe('computeCalibration', () => {
  it('frozen question does NOT change, user DOES', () => {
    const r = computeCalibration(base)
    expect(r.question).toBeNull()
    expect(r.user!.rating).toBeGreaterThan(1500)
  })

  it('unfrozen question updates both sides', () => {
    const r = computeCalibration({ ...base, questionFrozen: false })
    expect(r.question).not.toBeNull()
    expect(r.user).not.toBeNull()
    expect(r.question!.rating).toBeLessThan(1700)
  })

  it('count_in_calibration=false → ไม่ update อะไรเลย (social repeat)', () => {
    const r = computeCalibration({ ...base, countInCalibration: false })
    expect(r.user).toBeNull()
    expect(r.question).toBeNull()
  })
})

describe('shouldUnfreeze', () => {
  it('stays frozen below threshold', () => expect(shouldUnfreeze(5)).toBe(false))
  it('unfreezes at threshold', () => expect(shouldUnfreeze(20)).toBe(true))
})
