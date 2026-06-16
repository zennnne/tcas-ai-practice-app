# TCAS App

## Dev setup
1. `pnpm install`
2. `pnpm supabase start` → คัดลอก keys ใส่ `.env.local` (ดู `.env.example`)
3. `pnpm supabase db reset` (apply migrations)
4. `pnpm dev`

## Test
- Unit: `pnpm test`
- E2E: `pnpm test:e2e`

## Seed bank import
`pnpm tsx scripts/import-seed.ts <questions.json>`
(seed = confidence 90, mock-eligible — gen ผ่าน Claude Code + พี่ verify มือ ตาม design §4.3)

## Schema
migrations อยู่ `supabase/migrations/` — content / calibration / tokens+subs / social / quality / RLS
