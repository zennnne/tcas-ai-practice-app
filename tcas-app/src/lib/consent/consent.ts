// Consent version constants and validation logic.
//
// Human TODO (issue #4 — ready-for-human):
//   - Replace placeholder legal text in /privacy and /terms pages with
//     real policy wording reviewed by a legal professional.
//   - When policy wording changes materially, bump PRIVACY_VERSION or
//     TERMS_VERSION (e.g. 'privacy_v2').  Existing users will be prompted
//     to re-consent on next login (re-consent gate — future PRD).
//   - Parental consent for minors (<20 yrs): not implemented. Requires
//     legal guidance on PDPA § 20 (minor data subject) before building.

/** Identifier for the current privacy policy draft. */
export const PRIVACY_VERSION = 'privacy_v1' as const

/** Identifier for the current terms of service draft. */
export const TERMS_VERSION = 'terms_v1' as const

/**
 * Combined policy version stored in `consents.policy_version`.
 * Format: '<privacy>+<terms>' — bump either side when the document changes.
 */
export const CURRENT_POLICY_VERSION =
  `${PRIVACY_VERSION}+${TERMS_VERSION}` as const

export type ConsentInput = {
  /** Whether the user explicitly ticked the consent checkbox. */
  consentGiven: boolean
  /** The policy version string shown to the user at the time of consent. */
  policyVersion: string
}

export type ConsentResult = { ok: true } | { ok: false; error: string }

/**
 * Validates that the user gave consent to the current policy version.
 * Pure function — no I/O side effects. Safe to test without DB.
 */
export function validateConsent(input: ConsentInput): ConsentResult {
  if (!input.consentGiven) {
    return {
      ok: false,
      error: 'ต้องยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อนสมัคร',
    }
  }
  if (input.policyVersion !== CURRENT_POLICY_VERSION) {
    return {
      ok: false,
      error: 'เวอร์ชันนโยบายไม่ตรงกัน กรุณาโหลดหน้าใหม่',
    }
  }
  return { ok: true }
}
