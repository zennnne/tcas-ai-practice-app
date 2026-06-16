import { describe, it, expect } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('questions schema', () => {
  const db = createAdminClient()

  it('rejects difficulty_level out of 1-5 range', async () => {
    const { error } = await db.from('questions').insert({
      subject: 'math', topic: 'trig', difficulty_level: 9,
      difficulty_value: 9.0, body: {},
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/difficulty_level/)
  })

  it('accepts a valid question with defaults', async () => {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic: 'trig', difficulty_level: 3,
      difficulty_value: 3.0, body: { q: '1+1?', answer: '2' },
    }).select().single()
    expect(error).toBeNull()
    expect(data!.confidence_score).toBe(70)
    expect(data!.difficulty_frozen).toBe(true)
    expect(data!.status).toBe('active')
    // cleanup
    await db.from('questions').delete().eq('id', data!.id)
  })
})
