import type { Status } from './gating'

export function downgradeTarget(
  sub: { status: Status; trialEndsAt: string | null },
  now: Date
): Status | null {
  if (sub.status !== 'trial' || !sub.trialEndsAt) return null
  return new Date(sub.trialEndsAt) <= now ? 'trial_expired_free' : null
}
