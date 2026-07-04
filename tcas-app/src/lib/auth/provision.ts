import type { SupabaseClient } from '@supabase/supabase-js'
import { capture } from '@/lib/analytics/capture'
import { TRIAL_DAYS, trialEndsAt } from '@/lib/billing/trial'

export interface ProvisionNewUserInput {
  userId: string
  policyVersion: string
}

// seed a freshly-signed-up user: token row, 7-day trial subscription, PDPA consent record
// + conversion-funnel events — called once, right after supabase.auth.signUp() succeeds
export async function provisionNewUser(db: SupabaseClient, input: ProvisionNewUserInput): Promise<void> {
  await db.from('tokens').insert({ user_id: input.userId })
  await db.from('subscriptions').insert({
    user_id: input.userId, status: 'trial', trial_ends_at: trialEndsAt(new Date()),
  })
  await db.from('consents').insert({ user_id: input.userId, policy_version: input.policyVersion })

  await capture('signup', input.userId)
  await capture('trial_started', input.userId, { trial_days: TRIAL_DAYS })
}
