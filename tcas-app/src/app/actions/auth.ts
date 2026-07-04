'use server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getClientIP, checkIpRateLimit } from '@/lib/rate-limit/ip'
import { validateConsent } from '@/lib/consent/consent'
import { provisionNewUser } from '@/lib/auth/provision'

export async function signup(
  email: string,
  password: string,
  consentGiven: boolean,
  policyVersion: string,
) {
  // Per-IP rate limit (fail-closed) before any work
  const ip = getClientIP(await headers())
  if (await checkIpRateLimit(ip)) return { error: 'ลองใหม่อีกครั้งภายหลัง' }

  // Validate consent before creating the user (PDPA requirement)
  const consentCheck = validateConsent({ consentGiven, policyVersion })
  if (!consentCheck.ok) return { error: consentCheck.error }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }

  await provisionNewUser(supabase, { userId: data.user!.id, policyVersion })
  return { ok: true }
}

export async function login(email: string, password: string) {
  const ip = getClientIP(await headers())
  if (await checkIpRateLimit(ip)) return { error: 'ลองใหม่อีกครั้งภายหลัง' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { ok: true }
}
