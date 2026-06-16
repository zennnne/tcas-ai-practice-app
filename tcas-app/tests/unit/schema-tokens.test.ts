import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('tokens + subscriptions schema', () => {
  const db = createAdminClient()
  let userId: string

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `tok-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('subscriptions rejects invalid status', async () => {
    const { error } = await db.from('subscriptions').insert({
      user_id: userId, status: 'platinum',
    })
    expect(error).not.toBeNull()
  })

  it('tokens stores fractional balance (1 social → 0.5 practice)', async () => {
    const { data, error } = await db.from('tokens').insert({
      user_id: userId, practice_balance: 0.5, social_balance: 1,
    }).select().single()
    expect(error).toBeNull()
    expect(data!.practice_balance).toBe(0.5)
  })
})
