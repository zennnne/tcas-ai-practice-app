export type Tier = 'free' | 'tier1' | 'tier2'
export interface Balance { practice: number; social: number }

export const TIER_GRANTS: Record<Tier, Balance> = {
  free: { practice: 0, social: 0 },
  tier1: { practice: 1, social: 1 },
  tier2: { practice: 3, social: 2 },
}
const CAP_DAYS = 7
const cap = (tier: Tier, kind: keyof Balance) => TIER_GRANTS[tier][kind] * CAP_DAYS

export function grantDaily(bal: Balance, tier: Tier): Balance {
  const g = TIER_GRANTS[tier]
  return {
    practice: Math.min(bal.practice + g.practice, cap(tier, 'practice')),
    social: Math.min(bal.social + g.social, cap(tier, 'social')),
  }
}

const TRANSFER_RATE = 0.5
export function transferSocialToPractice(bal: Balance, socialAmount: number, tier: Tier = 'tier2'): Balance {
  if (socialAmount > bal.social) throw new Error('insufficient social tokens')
  const gained = socialAmount * TRANSFER_RATE
  return {
    social: bal.social - socialAmount,
    practice: Math.min(bal.practice + gained, cap(tier, 'practice')),
  }
}
