'use server'
import { omise, TIER_PRICE_SATANG } from '@/lib/billing/omise'
import { createClient } from '@/lib/supabase/server'

export async function startCheckout(tier: 'tier1' | 'tier2', token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'unauthorized' }

  const { data: sub } = await supabase
    .from('subscriptions').select('status').eq('user_id', user.id).single()
  if (sub?.status === 'paid') return { ok: false as const, error: 'already_subscribed' }

  try {
    const charge = await omise.charges.create({
      amount: TIER_PRICE_SATANG[tier],
      currency: 'thb',
      source: token,
      metadata: { user_id: user.id, tier },
    })
    return { ok: true as const, authorizeUri: charge.authorize_uri, chargeId: charge.id }
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'payment_error' }
  }
}
