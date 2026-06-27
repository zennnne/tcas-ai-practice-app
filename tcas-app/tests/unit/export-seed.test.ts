import { describe, it, expect } from 'vitest'
import { toSeedQuestion } from '@/../scripts/export-seed'
import { validateSeedQuestion, type SeedQuestion } from '@/../scripts/import-seed'

const dbRow = {
  subject: 'math',
  topic: 'trig',
  difficulty_level: 3,
  body: { q: 'sin30?', choices: ['0.5', '1'], answer: '0.5', solution: 'unit circle' },
}

describe('toSeedQuestion', () => {
  it('maps a DB row to SeedQuestion shape', () => {
    const result = toSeedQuestion(dbRow)
    expect(result).toEqual<SeedQuestion>({
      subject: 'math',
      topic: 'trig',
      difficulty_level: 3,
      body: { q: 'sin30?', choices: ['0.5', '1'], answer: '0.5', solution: 'unit circle' },
    })
  })

  it('round-trips: output passes validateSeedQuestion', () => {
    const result = toSeedQuestion(dbRow)
    expect(validateSeedQuestion(result)).toEqual({ ok: true })
  })

  it('preserves difficulty_level 1 (edge)', () => {
    const row = { ...dbRow, difficulty_level: 1 }
    const result = toSeedQuestion(row)
    expect(validateSeedQuestion(result)).toEqual({ ok: true })
  })

  it('preserves difficulty_level 5 (edge)', () => {
    const row = { ...dbRow, difficulty_level: 5 }
    const result = toSeedQuestion(row)
    expect(validateSeedQuestion(result)).toEqual({ ok: true })
  })
})

// Note: exportSeed() requires a live DB connection (admin client + Supabase).
// Integration test is deferred — run manually:
//   pnpm tsx scripts/export-seed.ts out.json
