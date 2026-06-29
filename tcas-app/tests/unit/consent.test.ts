import { describe, it, expect } from 'vitest'
import {
  validateConsent,
  CURRENT_POLICY_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/lib/consent/consent'

// Unit tests for consent validation logic (pure, no DB).
// DB-integration test (consent row persisted after signup) deferred to
// integration suite — requires live Supabase; see issue #4.

describe('validateConsent', () => {
  it('consent=true + correct version → ok', () => {
    const result = validateConsent({
      consentGiven: true,
      policyVersion: CURRENT_POLICY_VERSION,
    })
    expect(result.ok).toBe(true)
  })

  it('consent=false → rejected with error message', () => {
    const result = validateConsent({
      consentGiven: false,
      policyVersion: CURRENT_POLICY_VERSION,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  it('consent=true but stale/wrong version → rejected', () => {
    const result = validateConsent({
      consentGiven: true,
      policyVersion: 'privacy_v0+terms_v0', // outdated
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeTruthy()
    }
  })

  it('consent=false + wrong version → rejected (consent check is first)', () => {
    const result = validateConsent({
      consentGiven: false,
      policyVersion: 'stale_version',
    })
    expect(result.ok).toBe(false)
  })

  it('CURRENT_POLICY_VERSION includes both PRIVACY_VERSION and TERMS_VERSION', () => {
    expect(CURRENT_POLICY_VERSION).toContain(PRIVACY_VERSION)
    expect(CURRENT_POLICY_VERSION).toContain(TERMS_VERSION)
  })
})
