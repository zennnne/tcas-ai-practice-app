import { describe, it, expect } from 'vitest'
import { validateSeedQuestion, type SeedQuestion } from '@/../scripts/import-seed'

describe('validateSeedQuestion', () => {
  const valid: SeedQuestion = {
    subject: 'math', topic: 'trig', difficulty_level: 3,
    body: { q: 'sin30?', choices: ['0.5','1'], answer: '0.5' },
  }

  it('accepts a valid seed question', () => {
    expect(validateSeedQuestion(valid)).toEqual({ ok: true })
  })

  it('rejects difficulty_level out of range', () => {
    const r = validateSeedQuestion({ ...valid, difficulty_level: 6 })
    expect(r.ok).toBe(false)
  })

  it('rejects missing answer in body', () => {
    const r = validateSeedQuestion({ ...valid, body: { q: 'x', choices: [] } as any })
    expect(r.ok).toBe(false)
  })
})
