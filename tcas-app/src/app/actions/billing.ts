'use server'
import { omise, TIER_PRICE_SATANG } from '@/lib/billing/omise'
import { createClient } from '@/lib/supabase/server'

export async function startCheckout(tier: 'tier1' | 'tier2', token: string) {
  // token = Omise.js source token (PromptPay/card) จาก client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }
  const charge = await omise.charges.create({
    amount: TIER_PRICE_SATANG[tier],
    currency: 'thb',
    source: token,
    metadata: { user_id: user.id, tier },
  })
  return { ok: true, authorizeUri: charge.authorize_uri, chargeId: charge.id }
}
