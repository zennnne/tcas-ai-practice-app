import { describe, it, expect } from 'vitest'
import { nextServingLevel, rankToLevel } from '@/lib/practice/serving'

describe('serving difficulty (layer 2)', () => {
  it('maps true_rank to a 1-5 level', () => {
    expect(rankToLevel(1500)).toBeGreaterThanOrEqual(1)
    expect(rankToLevel(1500)).toBeLessThanOrEqual(5)
    expect(rankToLevel(2200)).toBeGreaterThan(rankToLevel(1200))
  })

  it('correct streak pushes serving level up', () => {
    expect(nextServingLevel(3, { streak: 2, lastCorrect: true })).toBe(4)
  })

  it('wrong answer pushes serving level down', () => {
    expect(nextServingLevel(3, { streak: -1, lastCorrect: false })).toBe(2)
  })

  it('serving level clamps to 1-5', () => {
    expect(nextServingLevel(5, { streak: 5, lastCorrect: true })).toBe(5)
    expect(nextServingLevel(1, { streak: -5, lastCorrect: false })).toBe(1)
  })
})
