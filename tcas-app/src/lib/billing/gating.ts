export type Status = 'trial' | 'trial_expired_free' | 'free' | 'paid'
export type Tier = 'free' | 'tier1' | 'tier2'
export interface SubState { status: Status; tier: Tier }

export interface Features {
  practice: boolean; showRank: boolean; mock: boolean; social: boolean; socialToken: boolean
}

export function featuresFor(s: SubState): Features {
  const fullAccess = s.status === 'trial' || s.status === 'paid'
  return {
    practice: true,           // ทุก state เล่น practice ได้ (free = recycled quota จำกัด)
    showRank: fullAccess,
    mock: fullAccess,
    social: fullAccess,
    socialToken: fullAccess,  // free ไม่มี social token (§3.3)
  }
}
