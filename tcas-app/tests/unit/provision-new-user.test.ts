import { describe, it, expect } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { provisionNewUser } from '@/lib/auth/provision'

// DB integration: seed tokens/trial subscription/consent ผ่าน seam เดียวหลัง signUp()
describe('provisionNewUser (DB)', () => {
  const db = createAdminClient()

  it('สร้าง tokens row, trial subscription 7 วัน, consent record', async () => {
    const { data } = await db.auth.admin.createUser({
      email: `provision-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    const userId = data.user!.id

    const before = Date.now()
    await provisionNewUser(db, { userId, policyVersion: 'v1' })

    const { data: token } = await db.from('tokens').select('practice_balance, social_balance')
      .eq('user_id', userId).single()
    expect(token).not.toBeNull()

    const { data: sub } = await db.from('subscriptions').select('status, trial_ends_at')
      .eq('user_id', userId).single()
    expect(sub!.status).toBe('trial')
    const daysLeft = (new Date(sub!.trial_ends_at).getTime() - before) / 864e5
    expect(daysLeft).toBeGreaterThan(6.9)
    expect(daysLeft).toBeLessThan(7.1)

    const { data: consent } = await db.from('consents').select('policy_version')
      .eq('user_id', userId).single()
    expect(consent!.policy_version).toBe('v1')
  })
})
