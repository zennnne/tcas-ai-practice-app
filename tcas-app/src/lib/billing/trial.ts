import type { Status } from './gating'

export const TRIAL_DAYS = 7

// trial_ends_at ตอน signup — บ้านเดียวกับ trialDaysLeft/downgradeTarget (concept "trial" เดียวกัน)
export function trialEndsAt(from: Date): string {
  return new Date(from.getTime() + TRIAL_DAYS * 864e5).toISOString()
}

export function downgradeTarget(
  sub: { status: Status; trialEndsAt: string | null },
  now: Date
): Status | null {
  if (sub.status !== 'trial' || !sub.trialEndsAt) return null
  return new Date(sub.trialEndsAt) <= now ? 'trial_expired_free' : null
}

// จำนวนวันที่เหลือของ trial (ปัดขึ้น, ไม่ติดลบ) — ใช้โชว์ banner หน้า /upgrade (issue #12 story 4)
export function trialDaysLeft(trialEndsAt: string, now: Date): number {
  const ms = new Date(trialEndsAt).getTime() - now.getTime()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
