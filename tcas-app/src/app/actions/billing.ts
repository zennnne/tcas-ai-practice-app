'use server'
import { omise, TIER_PRICE_SATANG } from '@/lib/billing/omise'
import { withAuth } from '@/lib/auth/with-auth'
import { isPaidSubscriber } from '@/lib/billing/subscription'
import { capture } from '@/lib/analytics/capture'

export async function startCheckout(tier: 'tier1' | 'tier2', token: string) {
  return withAuth(null, async ({ userId, supabase }) => {
    if (await isPaidSubscriber(supabase, userId)) return { ok: false as const, error: 'already_subscribed' }

    try {
      const charge = await omise.charges.create({
        amount: TIER_PRICE_SATANG[tier],
        currency: 'thb',
        source: token,
        metadata: { user_id: userId, tier },
      })
      // Conversion funnel: user initiated paid checkout (pre-authorization)
      await capture('upgrade_started', userId, { tier })
      return { ok: true as const, authorizeUri: charge.authorize_uri, chargeId: charge.id }
    } catch (e: unknown) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'payment_error' }
    }
  })
}
