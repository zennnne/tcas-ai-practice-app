export type Status = 'trial' | 'trial_expired_free' | 'free' | 'paid'
export type Tier = 'free' | 'tier1' | 'tier2'
export interface SubState { status: Status; tier: Tier }

export interface Features {
  practice: boolean; showRank: boolean; mock: boolean; social: boolean; socialToken: boolean
}

// single source of truth: "has paying access" — ใช้ทั้ง featuresFor + free-pool
export function isPremium(status: Status): boolean {
  return status === 'trial' || status === 'paid'
}

export function featuresFor(s: SubState): Features {
  // s.tier intentionally unused at MVP — tier1/tier2 same feature set (§ future phase)
  const fullAccess = isPremium(s.status)
  return {
    practice: true,           // ทุก state เล่น practice ได้ (free = recycled quota จำกัด)
    showRank: fullAccess,
    mock: fullAccess,
    social: fullAccess,
    socialToken: fullAccess,  // free ไม่มี social token (§3.3)
  }
}
