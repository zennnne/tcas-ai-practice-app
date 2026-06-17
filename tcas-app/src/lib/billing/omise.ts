import Omise from 'omise'

export const omise = Omise({
  secretKey: process.env.OMISE_SECRET_KEY!,
  omiseVersion: '2019-05-29',
})

export const TIER_PRICE_SATANG = { tier1: 9900, tier2: 24900 } as const // 99/249 บาท → สตางค์
