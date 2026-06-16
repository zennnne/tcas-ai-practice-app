# P3: Reverse Trial + Omise Payment + Feature Gating — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำ monetization — reverse trial (trial เต็ม → free จำกัด → paid), feature gating ต่อ state, จ่ายเงินผ่าน Omise (PromptPay/card) แบบ web, auto-downgrade เมื่อ trial หมด

**Architecture:** Feature gating เป็น **pure function** (`gating.ts`) map (status, tier) → allowed features → ใช้ทั้งใน server actions + UI. Trial expiry เป็น pure check + scheduled downgrade. Omise: checkout สร้าง charge ฝั่ง server, ยืนยันผ่าน **webhook** (source of truth ของการจ่าย) → upgrade subscription. Free-tier practice ดึงจาก recycled pool เท่านั้น (ไม่ trigger gen — กฎเหล็ก §3.1).

**Tech Stack:** ต่อจาก P1/P2. เพิ่ม: `omise` Node SDK, Next.js route handler (webhook)

> 📐 design refs: §3.1 reverse trial + กฎเหล็ก, §3.2 feature gating, §3.3 pricing. Schema P1 (subscriptions: trial/trial_expired_free/free/paid; tokens)

---

## File Structure

```
src/
├── lib/
│   ├── billing/
│   │   ├── gating.ts          # pure: (status,tier) → features
│   │   ├── trial.ts           # pure: expiry check + downgrade target
│   │   └── omise.ts           # Omise client + create charge
│   └── practice/
│       └── free-pool.ts       # free-tier recycled-only selection (no gen)
├── app/
│   ├── actions/
│   │   └── billing.ts         # startCheckout server action
│   ├── api/
│   │   └── webhooks/omise/route.ts  # payment webhook → upgrade
│   └── upgrade/page.tsx       # หน้าเลือก tier + จ่าย
tests/unit/
├── gating.test.ts
├── trial.test.ts
└── free-pool.test.ts
```

---

## Task 1: Feature gating pure function

**Files:**
- Create: `src/lib/billing/gating.ts`
- Test: `tests/unit/gating.test.ts`

> §3.2: free = practice เท่านั้น + ซ่อน rank + ไม่มี mock/social/social-token · trial+paid = ครบ

- [ ] **Step 1: test**

`tests/unit/gating.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { featuresFor, type SubState } from '@/lib/billing/gating'

describe('featuresFor', () => {
  it('free: practice only, rank hidden, no mock/social', () => {
    const f = featuresFor({ status: 'free', tier: 'free' })
    expect(f.practice).toBe(true)
    expect(f.showRank).toBe(false)
    expect(f.mock).toBe(false)
    expect(f.social).toBe(false)
  })
  it('trial: everything on', () => {
    const f = featuresFor({ status: 'trial', tier: 'free' })
    expect(f).toMatchObject({ practice: true, showRank: true, mock: true, social: true })
  })
  it('paid tier2: everything on', () => {
    const f = featuresFor({ status: 'paid', tier: 'tier2' })
    expect(f).toMatchObject({ practice: true, showRank: true, mock: true, social: true })
  })
  it('trial_expired_free behaves like free', () => {
    const f = featuresFor({ status: 'trial_expired_free', tier: 'free' })
    expect(f.social).toBe(false)
    expect(f.showRank).toBe(false)
  })
})
```

- [ ] **Step 2: รัน → fail → implement**

`src/lib/billing/gating.ts`:
```typescript
export type Status = 'trial' | 'trial_expired_free' | 'free' | 'paid'
export type Tier = 'free' | 'tier1' | 'tier2'
export interface SubState { status: Status; tier: Tier }

export interface Features {
  practice: boolean; showRank: boolean; mock: boolean; social: boolean; socialToken: boolean
}

export function featuresFor(s: SubState): Features {
  const fullAccess = s.status === 'trial' || s.status === 'paid'
  return {
    practice: true,                 // ทุก state เล่น practice ได้ (free = recycled quota จำกัด)
    showRank: fullAccess,
    mock: fullAccess,
    social: fullAccess,
    socialToken: fullAccess,        // free ไม่มี social token (§3.3)
  }
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/gating.test.ts
git add -A && git commit -m "feat: feature gating (free/trial/paid → features)"
```
Expected: 4 passed

---

## Task 2: Trial expiry + auto-downgrade

**Files:**
- Create: `src/lib/billing/trial.ts`, `supabase/migrations/0008_trial_downgrade.sql`
- Test: `tests/unit/trial.test.ts`

- [ ] **Step 1: test (pure expiry logic)**

`tests/unit/trial.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { downgradeTarget } from '@/lib/billing/trial'

const now = new Date('2026-09-10T00:00:00Z')

describe('downgradeTarget', () => {
  it('trial past trial_ends_at → trial_expired_free', () => {
    expect(downgradeTarget({ status: 'trial', trialEndsAt: '2026-09-01T00:00:00Z' }, now))
      .toBe('trial_expired_free')
  })
  it('trial still within window → no change (null)', () => {
    expect(downgradeTarget({ status: 'trial', trialEndsAt: '2026-09-20T00:00:00Z' }, now))
      .toBeNull()
  })
  it('paid never downgrades on expiry', () => {
    expect(downgradeTarget({ status: 'paid', trialEndsAt: '2026-09-01T00:00:00Z' }, now))
      .toBeNull()
  })
})
```

- [ ] **Step 2: implement**

`src/lib/billing/trial.ts`:
```typescript
import type { Status } from './gating'

export function downgradeTarget(
  sub: { status: Status; trialEndsAt: string | null },
  now: Date
): Status | null {
  if (sub.status !== 'trial' || !sub.trialEndsAt) return null
  return new Date(sub.trialEndsAt) <= now ? 'trial_expired_free' : null
}
```

- [ ] **Step 3: SQL scheduled downgrade**

`supabase/migrations/0008_trial_downgrade.sql`:
```sql
create or replace function expire_trials() returns void language sql as $$
  update subscriptions set status = 'trial_expired_free', updated_at = now()
  where status = 'trial' and trial_ends_at is not null and trial_ends_at <= now();
$$;
-- schedule: select cron.schedule('expire-trials','0 * * * *','select expire_trials()');
```

- [ ] **Step 4: รัน test + apply + commit**

```bash
pnpm test tests/unit/trial.test.ts && pnpm supabase db reset
git add -A && git commit -m "feat: trial expiry logic + scheduled auto-downgrade"
```
Expected: 3 passed, migration ok

---

## Task 3: Free-tier recycled-only pool (กฎเหล็ก)

**Files:**
- Create: `src/lib/practice/free-pool.ts`
- Test: `tests/unit/free-pool.test.ts`

> §3.1 กฎเหล็ก: free กิน recycled pool เท่านั้น — **ห้าม trigger gen/escape-hatch**

- [ ] **Step 1: test**

`tests/unit/free-pool.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { canTriggerGen } from '@/lib/practice/free-pool'

describe('canTriggerGen', () => {
  it('free user can NEVER trigger gen', () => {
    expect(canTriggerGen('free')).toBe(false)
    expect(canTriggerGen('trial_expired_free')).toBe(false)
  })
  it('trial/paid can trigger gen (escape-hatch eligible)', () => {
    expect(canTriggerGen('trial')).toBe(true)
    expect(canTriggerGen('paid')).toBe(true)
  })
})
```

- [ ] **Step 2: implement**

`src/lib/practice/free-pool.ts`:
```typescript
import type { Status } from '@/lib/billing/gating'

// กฎเหล็ก §3.1: free ดึงได้แค่โจทย์ที่มีใน pool (recycled) — ห้าม trigger gen สด
export function canTriggerGen(status: Status): boolean {
  return status === 'trial' || status === 'paid'
}
```
> integration: ใน serving (P2 `pickQuestion`) ถ้า available=0 → เช็ค `canTriggerGen` ก่อนเรียก escape-hatch; free → แสดง "วันนี้หมดโควต้า" แทน gen

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/free-pool.test.ts
git add -A && git commit -m "feat: free-tier recycled-only guard (no gen trigger)"
```
Expected: 2 passed

---

## Task 4: Omise checkout (create charge)

**Files:**
- Create: `src/lib/billing/omise.ts`, `src/app/actions/billing.ts`, `src/app/upgrade/page.tsx`

> .env เพิ่ม `OMISE_SECRET_KEY`, `OMISE_PUBLIC_KEY`, `OMISE_WEBHOOK_SECRET`

- [ ] **Step 1: ติดตั้ง SDK + Omise client**

Run: `pnpm add omise`

`src/lib/billing/omise.ts`:
```typescript
import Omise from 'omise'

export const omise = Omise({
  secretKey: process.env.OMISE_SECRET_KEY!,
  omiseVersion: '2019-05-29',
})

export const TIER_PRICE_SATANG = { tier1: 9900, tier2: 24900 } as const // 99/249 บาท → สตางค์
```

- [ ] **Step 2: startCheckout server action**

`src/app/actions/billing.ts`:
```typescript
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
    metadata: { user_id: user.id, tier }, // webhook ใช้ map กลับ
  })
  return { ok: true, authorizeUri: charge.authorize_uri, chargeId: charge.id }
}
```

- [ ] **Step 3: upgrade page (Omise.js)**

`src/app/upgrade/page.tsx`: โหลด Omise.js, แสดงปุ่ม Tier1/Tier2, สร้าง source (PromptPay/card) → เรียก `startCheckout` → redirect `authorize_uri` (PromptPay QR / 3DS). (UI detail เติมตาม Omise.js docs)

- [ ] **Step 4: commit**

```bash
git add -A && git commit -m "feat: Omise checkout (create charge, PromptPay/card)"
```

---

## Task 5: Omise webhook → upgrade subscription

**Files:**
- Create: `src/app/api/webhooks/omise/route.ts`
- Test: `tests/unit/webhook-omise.test.ts`

> webhook = source of truth ของการจ่าย (ไม่เชื่อ client). verify signature + idempotent

- [ ] **Step 1: test — parse successful charge → upgrade payload**

`tests/unit/webhook-omise.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseChargeComplete } from '@/app/api/webhooks/omise/route'

describe('parseChargeComplete', () => {
  it('successful charge → upgrade (user_id, tier, paid)', () => {
    const event = {
      key: 'charge.complete',
      data: { status: 'successful', metadata: { user_id: 'u1', tier: 'tier2' } },
    }
    expect(parseChargeComplete(event)).toEqual({ userId: 'u1', tier: 'tier2', upgrade: true })
  })
  it('failed charge → no upgrade', () => {
    const event = { key: 'charge.complete', data: { status: 'failed', metadata: { user_id: 'u1', tier: 'tier1' } } }
    expect(parseChargeComplete(event)!.upgrade).toBe(false)
  })
  it('non-charge event → null', () => {
    expect(parseChargeComplete({ key: 'refund.create', data: {} })).toBeNull()
  })
})
```

- [ ] **Step 2: implement route + parser**

`src/app/api/webhooks/omise/route.ts`:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

export interface OmiseEvent { key: string; data: any }
export interface UpgradeIntent { userId: string; tier: string; upgrade: boolean }

export function parseChargeComplete(event: OmiseEvent): UpgradeIntent | null {
  if (event.key !== 'charge.complete') return null
  const m = event.data?.metadata ?? {}
  return { userId: m.user_id, tier: m.tier, upgrade: event.data?.status === 'successful' }
}

export async function POST(req: Request) {
  // TODO ตอน implement: verify webhook signature ด้วย OMISE_WEBHOOK_SECRET ก่อน parse
  const event = (await req.json()) as OmiseEvent
  const intent = parseChargeComplete(event)
  if (!intent || !intent.upgrade) return new Response('ok', { status: 200 })

  const db = createAdminClient()
  await db.from('subscriptions').update({
    status: 'paid', tier: intent.tier, updated_at: new Date().toISOString(),
  }).eq('user_id', intent.userId)
  return new Response('ok', { status: 200 })
}
```
> ⚠️ implement note: เพิ่ม signature verification (Omise ส่ง header) ก่อน trust payload — กัน spoofed upgrade

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/webhook-omise.test.ts
git add -A && git commit -m "feat: Omise webhook → upgrade to paid (parse + persist)"
```
Expected: 3 passed

---

## Task 6: Gating guard ใน routes + full test

**Files:**
- Modify: `src/app/actions/practice.ts` (เพิ่ม free gen guard), social/mock entry (P4/P5 จะ import `featuresFor`)

- [ ] **Step 1: wire free-pool guard เข้า practice serving**

แก้ practice serving (P2): ก่อนเรียก escape-hatch → เช็ค `canTriggerGen(status)`; ถ้า free → return "โควต้าหมด" ไม่ gen

- [ ] **Step 2: full test**

Run: `pnpm test`
Expected: gating 4 + trial 3 + free-pool 2 + webhook 3 + (P1/P2 เดิม) ผ่านหมด

- [ ] **Step 3: commit**

```bash
git add -A && git commit -m "feat: wire free-tier gen guard + P3 suite green"
```

---

## Self-Review

**Spec coverage:**
- ✅ Feature gating free/trial/paid (§3.2) → Task 1
- ✅ Reverse trial auto-downgrade (§3.1) → Task 2
- ✅ กฎเหล็ก free=recycled no-gen (§3.1) → Task 3
- ✅ Omise checkout + webhook upgrade (§3.1 payment) → Task 4-5
- ✅ Gating guard wired → Task 6

**Out of scope:** social/mock gating *enforcement* ใน UI (P4/P5 import `featuresFor`), trial duration เป๊ะ (TBD §9 — ใช้ 7 วันใน code, ปรับ 1 ที่), trial consumption ceiling (C2 — แนะนำ implement เป็น per-day refill-demand limit ตอน wire escape-hatch กับ trial cohort)

**Placeholder scan:** Task 4 Step 3 + Task 5 signature-verify เป็น integration detail (Omise.js markup / signature algo จาก Omise docs) — contract (charge metadata, event.key) กำหนดครบ ✅ มี ⚠️ note ชัดว่าต้อง verify signature

**Type consistency:** `Status`/`Tier`/`SubState` (gating.ts) ใช้ตรงใน trial.ts + free-pool.ts ✅ · `featuresFor` import P4/P5 ✅ · subscriptions status enum ตรง P1 (trial/trial_expired_free/free/paid) ✅
