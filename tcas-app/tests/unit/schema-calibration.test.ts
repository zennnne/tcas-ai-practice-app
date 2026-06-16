import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('calibration schema', () => {
  const db = createAdminClient()
  let userId: string

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `cal-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('user_ratings defaults to Glicko start (1500, rd 350)', async () => {
    const { data, error } = await db.from('user_ratings').insert({
      user_id: userId, subject: 'math', topic: 'trig',
    }).select().single()
    expect(error).toBeNull()
    expect(data!.true_rank).toBe(1500)
    expect(data!.rd).toBe(350)
  })

  it('skill_tier rejects tier > 5', async () => {
    const { error } = await db.from('skill_tier').insert({
      user_id: userId, subject: 'math', topic: 'trig', tier: 7,
    })
    expect(error).not.toBeNull()
  })
})
