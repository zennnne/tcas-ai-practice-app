'use server'
import { createClient } from '@/lib/supabase/server'

export async function signup(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  const uid = data.user!.id
  await supabase.from('tokens').insert({ user_id: uid })
  await supabase.from('subscriptions').insert({
    user_id: uid, status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  })
  return { ok: true }
}

export async function login(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { ok: true }
}
