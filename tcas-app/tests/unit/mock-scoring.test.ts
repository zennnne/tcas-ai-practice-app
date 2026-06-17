import { describe, it, expect } from 'vitest'
import { scoreMock, admitChance, weakTopics } from '@/lib/mock/scoring'

describe('mock scoring', () => {
  const answers = [
    { topic: 'trig', correct: true }, { topic: 'trig', correct: true },
    { topic: 'calc', correct: false }, { topic: 'calc', correct: false },
  ]
  it('scoreMock = % ถูก', () => {
    expect(scoreMock(answers)).toBe(50) // 2/4
  })

  it('admitChance: คะแนนเหนือ median → สูง, ต่ำกว่า min → ต่ำ', () => {
    const cutoff = { min_score: 70, median_score: 80 }
    expect(admitChance(85, cutoff)).toBe('สูง')
    expect(admitChance(72, cutoff)).toBe('ปานกลาง')
    expect(admitChance(60, cutoff)).toBe('ต่ำ')
  })

  it('weakTopics = topic ที่ accuracy ต่ำกว่าเกณฑ์', () => {
    expect(weakTopics(answers, 0.5)).toContain('calc') // calc 0% < 50%
    expect(weakTopics(answers, 0.5)).not.toContain('trig') // trig 100%
  })
})
