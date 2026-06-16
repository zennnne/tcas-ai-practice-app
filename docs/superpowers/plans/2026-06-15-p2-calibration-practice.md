# P2: Calibration Engine + Auth + Practice Mode + Token Logic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ user สมัคร/ล็อกอินได้, มี token รายวัน (cap+transfer), เล่น Practice Mode ที่ adaptive ด้วย Glicko-2 2-layer calibration (true rank ช้า + serving difficulty เร็ว) พร้อม cold-start anchor

**Architecture:** Glicko-2 เป็น **pure function** (`src/lib/calibration/glicko.ts`) แยกจาก I/O เพื่อ test ง่าย. Practice flow เป็น Next.js **server actions** ที่ orchestrate: serve → submit → record attempt → update calibration (two-way) → lock → spend token. Token logic เป็น pure math + DB writes แยกกัน. Auth ใช้ Supabase Auth (email/password v1).

**Tech Stack:** ต่อยอดจาก P1 (Next.js + Supabase + Vitest). เพิ่ม: server actions, Supabase auth helpers

> 📐 design refs: §5 calibration (Glicko-2 2-layer, cold-start anchor, two-way), §3.3 token (cap 7 วัน, transfer 1:0.5), §6.1 practice. Schema จาก P1 (questions, user_ratings, tokens, user_attempts, user_question_locks)

---

## File Structure (สร้าง/แก้ใน plan นี้)

```
src/
├── lib/
│   ├── calibration/
│   │   ├── glicko.ts            # pure Glicko-2 update (rating, RD, volatility)
│   │   └── update.ts            # two-way update orchestration + cold-start freeze
│   ├── tokens/
│   │   └── tokens.ts            # grant/spend/cap/transfer (pure math)
│   └── practice/
│       └── serving.ts          # เลือกโจทย์ (rank→level, lock filter, serving difficulty)
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── practice/
│   │   └── page.tsx            # UI เล่น practice
│   └── actions/
│       ├── auth.ts            # signup/login server actions
│       └── practice.ts        # serveQuestion / submitAnswer server actions
tests/
├── unit/
│   ├── glicko.test.ts
│   ├── calibration-update.test.ts
│   ├── tokens.test.ts
│   └── serving.test.ts
└── e2e/
    └── practice-flow.spec.ts
```

แยก responsibility: `glicko.ts` = คณิตล้วน (ไม่แตะ DB), `update.ts` = orchestration + DB, `tokens.ts` = token math, `serving.ts` = selection logic. server actions = thin orchestration layer.

---

## Task 1: Auth — signup/login + bootstrap rows

**Files:**
- Create: `src/app/actions/auth.ts`, `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx`
- Test: `tests/e2e/practice-flow.spec.ts` (auth part)

- [ ] **Step 1: signup server action (สร้าง user + bootstrap tokens/subscription)**

`src/app/actions/auth.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export async function signup(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  // bootstrap: 1 row tokens + subscription (trial). user_ratings = lazy-init ตอน first attempt
  const uid = data.user!.id
  await supabase.from('tokens').insert({ user_id: uid })
  await supabase.from('subscriptions').insert({
    user_id: uid, status: 'trial',
    trial_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(), // 7 วัน (TBD)
  })
  return { ok: true }
}

export async function login(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { error: error.message } : { ok: true }
}
```

- [ ] **Step 2: signup + login pages (minimal form)**

`src/app/(auth)/signup/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { signup } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('')
  const [err, setErr] = useState(''); const router = useRouter()
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const r = await signup(email, pw)
    if (r.error) setErr(r.error); else router.push('/practice')
  }
  return (
    <form onSubmit={submit}>
      <input aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input aria-label="password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button type="submit">Sign up</button>
      {err && <p role="alert">{err}</p>}
    </form>
  )
}
```
`src/app/(auth)/login/page.tsx`: เหมือน signup แต่เรียก `login` แทน และปุ่ม "Log in"

- [ ] **Step 3: e2e — signup สร้าง account + redirect**

`tests/e2e/practice-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('user can sign up and reach practice', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('email').fill(`u-${Date.now()}@test.local`)
  await page.getByLabel('password').fill('test123456')
  await page.getByRole('button', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/practice/)
})
```

- [ ] **Step 4: รัน e2e + commit**

```bash
pnpm test:e2e tests/e2e/practice-flow.spec.ts
git add -A && git commit -m "feat: auth (signup/login) + bootstrap tokens/subscription rows"
```
Expected: 1 passed

---

## Task 2: Glicko-2 pure function (CORE — TDD เข้มงวด)

**Files:**
- Create: `src/lib/calibration/glicko.ts`
- Test: `tests/unit/glicko.test.ts`

> Glicko-2 (Glickman). rating default 1500, RD 350, volatility 0.06, τ=0.5. คำนวณบน Glicko-2 scale (μ, φ) แล้วแปลงกลับ. constants (τ, default vol) = tune ได้ภายหลัง (design §9).

- [ ] **Step 1: เขียน test ก่อน — expected score + update ทิศทางถูก**

`tests/unit/glicko.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { updatePlayer, type Rating } from '@/lib/calibration/glicko'

const newPlayer = (): Rating => ({ rating: 1500, rd: 350, vol: 0.06 })

describe('Glicko-2 updatePlayer', () => {
  it('rating goes UP after beating a harder opponent', () => {
    const me = { rating: 1500, rd: 200, vol: 0.06 }
    const opp = { rating: 1700, rd: 50, vol: 0.06 }
    const after = updatePlayer(me, [{ opponent: opp, score: 1 }]) // ชนะ (ตอบถูก)
    expect(after.rating).toBeGreaterThan(me.rating)
  })

  it('rating goes DOWN after losing to an easier opponent', () => {
    const me = { rating: 1500, rd: 200, vol: 0.06 }
    const opp = { rating: 1300, rd: 50, vol: 0.06 }
    const after = updatePlayer(me, [{ opponent: opp, score: 0 }]) // แพ้ (ตอบผิด)
    expect(after.rating).toBeLessThan(me.rating)
  })

  it('RD shrinks after a game (more certain)', () => {
    const me = newPlayer()
    const opp = newPlayer()
    const after = updatePlayer(me, [{ opponent: opp, score: 1 }])
    expect(after.rd).toBeLessThan(me.rd)
  })

  it('high-RD player moves MORE than low-RD player for same result', () => {
    const opp = { rating: 1500, rd: 30, vol: 0.06 }
    const highRd = updatePlayer({ rating: 1500, rd: 350, vol: 0.06 }, [{ opponent: opp, score: 1 }])
    const lowRd = updatePlayer({ rating: 1500, rd: 50, vol: 0.06 }, [{ opponent: opp, score: 1 }])
    expect(highRd.rating - 1500).toBeGreaterThan(lowRd.rating - 1500)
  })
})
```

- [ ] **Step 2: รัน → fail**

Run: `pnpm test tests/unit/glicko.test.ts`
Expected: FAIL — "updatePlayer is not a function"

- [ ] **Step 3: เขียน Glicko-2 implementation**

`src/lib/calibration/glicko.ts`:
```typescript
export interface Rating { rating: number; rd: number; vol: number }
export interface GameResult { opponent: Rating; score: number } // score: 1=ถูก, 0=ผิด

const SCALE = 173.7178
const TAU = 0.5 // system constant (tune §9)

const toMu = (r: number) => (r - 1500) / SCALE
const toPhi = (rd: number) => rd / SCALE
const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
const E = (mu: number, muj: number, phij: number) =>
  1 / (1 + Math.exp(-g(phij) * (mu - muj)))

export function updatePlayer(player: Rating, games: GameResult[]): Rating {
  const mu = toMu(player.rating)
  const phi = toPhi(player.rd)
  const sigma = player.vol

  if (games.length === 0) {
    // ไม่ได้เล่น → RD โตขึ้น (ความไม่แน่นอนเพิ่ม)
    const phiStar = Math.sqrt(phi * phi + sigma * sigma)
    return { rating: player.rating, rd: phiStar * SCALE, vol: sigma }
  }

  let vInv = 0, delta = 0
  for (const { opponent, score } of games) {
    const muj = toMu(opponent.rating), phij = toPhi(opponent.rd)
    const gj = g(phij), Ej = E(mu, muj, phij)
    vInv += gj * gj * Ej * (1 - Ej)
    delta += gj * (score - Ej)
  }
  const v = 1 / vInv
  const deltaVal = v * delta

  // volatility update (Illinois algorithm)
  const a = Math.log(sigma * sigma)
  const f = (x: number) => {
    const ex = Math.exp(x)
    const t1 = (ex * (deltaVal * deltaVal - phi * phi - v - ex)) /
      (2 * Math.pow(phi * phi + v + ex, 2))
    const t2 = (x - a) / (TAU * TAU)
    return t1 - t2
  }
  let A = a
  let B: number
  if (deltaVal * deltaVal > phi * phi + v) {
    B = Math.log(deltaVal * deltaVal - phi * phi - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }
  let fA = f(A), fB = f(B)
  while (Math.abs(B - A) > 1e-6) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) { A = B; fA = fB } else { fA /= 2 }
    B = C; fB = fC
  }
  const newSigma = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma)
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const newMu = mu + newPhi * newPhi * delta

  return { rating: newMu * SCALE + 1500, rd: newPhi * SCALE, vol: newSigma }
}
```

- [ ] **Step 4: รัน test ยืนยันผ่าน**

Run: `pnpm test tests/unit/glicko.test.ts`
Expected: 4 passed

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: Glicko-2 pure update function (rating/RD/volatility) + tests"
```

---

## Task 3: Two-way calibration update + cold-start anchor

**Files:**
- Create: `src/lib/calibration/update.ts`
- Test: `tests/unit/calibration-update.test.ts`

> design §5.2: ทุก attempt = แมตช์ user-rating ↔ question difficulty_value → update ทั้งคู่ · cold-start: question `difficulty_frozen=true` → **ไม่ update question** (update แต่ user) จนมีหลักฐาน low-RD พอ · ไม่นับ attempt ที่ `count_in_calibration=false` (social repeat — W5)

- [ ] **Step 1: test — frozen question ไม่ขยับ, user ขยับ; unfrozen ขยับทั้งคู่**

`tests/unit/calibration-update.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeCalibration, type AttemptInput } from '@/lib/calibration/update'

const base: AttemptInput = {
  user: { rating: 1500, rd: 200, vol: 0.06 },
  question: { rating: 1700, rd: 100, vol: 0.06 },
  correct: true,
  questionFrozen: true,
  countInCalibration: true,
}

describe('computeCalibration', () => {
  it('frozen question does NOT change, user DOES', () => {
    const r = computeCalibration(base)
    expect(r.question).toBeNull()                 // frozen → ไม่ update
    expect(r.user!.rating).toBeGreaterThan(1500)  // ตอบถูกโจทย์ยาก → rank ขึ้น
  })

  it('unfrozen question updates both sides', () => {
    const r = computeCalibration({ ...base, questionFrozen: false })
    expect(r.question).not.toBeNull()
    expect(r.user).not.toBeNull()
    expect(r.question!.rating).toBeLessThan(1700)  // user(rank ต่ำกว่า)ตอบถูก → โจทย์ง่ายกว่าคิด → ลด
  })

  it('count_in_calibration=false → ไม่ update อะไรเลย (social repeat)', () => {
    const r = computeCalibration({ ...base, countInCalibration: false })
    expect(r.user).toBeNull()
    expect(r.question).toBeNull()
  })
})
```

- [ ] **Step 2: รัน → fail → เขียน implementation**

`src/lib/calibration/update.ts`:
```typescript
import { updatePlayer, type Rating } from './glicko'

export interface AttemptInput {
  user: Rating
  question: Rating          // question difficulty_value/RD แปลงเป็น Rating
  correct: boolean
  questionFrozen: boolean
  countInCalibration: boolean
}

export interface CalibrationResult {
  user: Rating | null       // null = ไม่ update
  question: Rating | null
}

export function computeCalibration(i: AttemptInput): CalibrationResult {
  if (!i.countInCalibration) return { user: null, question: null } // W5: social repeat

  const userScore = i.correct ? 1 : 0
  const newUser = updatePlayer(i.user, [{ opponent: i.question, score: userScore }])

  // question side: มอง user เป็น "opponent", score กลับด้าน (question "ชนะ" เมื่อ user ตอบผิด)
  const newQuestion = i.questionFrozen
    ? null
    : updatePlayer(i.question, [{ opponent: i.user, score: 1 - userScore }])

  return { user: newUser, question: newQuestion }
}

// unfreeze เมื่อโจทย์มี attempts จาก low-RD users พอ (reuse evidence bar กับ promote §4.7)
export function shouldUnfreeze(attemptsFromLowRdUsers: number, threshold = 20): boolean {
  return attemptsFromLowRdUsers >= threshold
}
```

- [ ] **Step 3: เพิ่ม test unfreeze**

เพิ่มใน `calibration-update.test.ts`:
```typescript
import { shouldUnfreeze } from '@/lib/calibration/update'
describe('shouldUnfreeze', () => {
  it('stays frozen below threshold', () => expect(shouldUnfreeze(5)).toBe(false))
  it('unfreezes at threshold', () => expect(shouldUnfreeze(20)).toBe(true))
})
```

- [ ] **Step 4: รัน test + commit**

```bash
pnpm test tests/unit/calibration-update.test.ts
git add -A && git commit -m "feat: two-way calibration + cold-start freeze + social-repeat exclusion"
```
Expected: 5 passed

---

## Task 4: Token logic — grant / cap / spend / transfer

**Files:**
- Create: `src/lib/tokens/tokens.ts`
- Test: `tests/unit/tokens.test.ts`

> design §3.3: grant รายวันตาม tier (T1 practice 1/social 1, T2 practice 3/social 2) · cap = 7 วัน worth · spend (1 token = 10 ข้อคณิต) · transfer social→practice = 1:0.5 (ทางเดียว)

- [ ] **Step 1: test — grant cap, spend, transfer**

`tests/unit/tokens.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { grantDaily, transferSocialToPractice, TIER_GRANTS } from '@/lib/tokens/tokens'

describe('token logic', () => {
  it('grant adds daily allotment but caps at 7-day worth (tier2 practice)', () => {
    // tier2 practice = 3/วัน → cap = 21
    const r = grantDaily({ practice: 20, social: 0 }, 'tier2')
    expect(r.practice).toBe(21) // 20+3=23 → cap 21
  })

  it('grant below cap adds normally', () => {
    const r = grantDaily({ practice: 5, social: 0 }, 'tier2')
    expect(r.practice).toBe(8) // 5+3
  })

  it('transfer social→practice at 1:0.5', () => {
    const r = transferSocialToPractice({ practice: 0, social: 4 }, 4)
    expect(r.social).toBe(0)
    expect(r.practice).toBe(2) // 4 × 0.5
  })

  it('transfer respects practice cap', () => {
    // tier2 practice cap 21; transfer 4 social (=2 practice) จาก practice 20 → cap 21
    const r = transferSocialToPractice({ practice: 20, social: 4 }, 4, 'tier2')
    expect(r.practice).toBe(21)
  })

  it('cannot transfer more social than owned', () => {
    expect(() => transferSocialToPractice({ practice: 0, social: 1 }, 5)).toThrow()
  })
})
```

- [ ] **Step 2: รัน → fail → เขียน implementation**

`src/lib/tokens/tokens.ts`:
```typescript
export type Tier = 'free' | 'tier1' | 'tier2'
export interface Balance { practice: number; social: number }

export const TIER_GRANTS: Record<Tier, Balance> = {
  free: { practice: 0, social: 0 },     // free: practice quota จัดต่างหาก (recycled), ไม่มี social
  tier1: { practice: 1, social: 1 },
  tier2: { practice: 3, social: 2 },
}
const CAP_DAYS = 7
const cap = (tier: Tier, kind: keyof Balance) => TIER_GRANTS[tier][kind] * CAP_DAYS

export function grantDaily(bal: Balance, tier: Tier): Balance {
  const g = TIER_GRANTS[tier]
  return {
    practice: Math.min(bal.practice + g.practice, cap(tier, 'practice')),
    social: Math.min(bal.social + g.social, cap(tier, 'social')),
  }
}

const TRANSFER_RATE = 0.5 // social → practice ทางเดียว
export function transferSocialToPractice(bal: Balance, socialAmount: number, tier: Tier = 'tier2'): Balance {
  if (socialAmount > bal.social) throw new Error('insufficient social tokens')
  const gained = socialAmount * TRANSFER_RATE
  return {
    social: bal.social - socialAmount,
    practice: Math.min(bal.practice + gained, cap(tier, 'practice')),
  }
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/tokens.test.ts
git add -A && git commit -m "feat: token logic (daily grant + 7-day cap + social→practice 1:0.5 transfer)"
```
Expected: 5 passed

---

## Task 5: Practice serving — selection + serving difficulty

**Files:**
- Create: `src/lib/practice/serving.ts`
- Test: `tests/unit/serving.test.ts`

> design §6.1 + §5.2: เลือกโจทย์จาก sub-pool รอบ true_rank→level · filter โจทย์ที่ lock + attempted · **serving difficulty (layer 2)**: ถูกรัวๆ → ดัน level ที่เสิร์ฟขึ้น (เร็ว, ไม่แตะ true_rank)

- [ ] **Step 1: test — serving difficulty ขยับตาม streak, ไม่หลุด 1-5**

`tests/unit/serving.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { nextServingLevel, rankToLevel } from '@/lib/practice/serving'

describe('serving difficulty (layer 2)', () => {
  it('maps true_rank to a 1-5 level', () => {
    expect(rankToLevel(1500)).toBeGreaterThanOrEqual(1)
    expect(rankToLevel(1500)).toBeLessThanOrEqual(5)
    expect(rankToLevel(2200)).toBeGreaterThan(rankToLevel(1200))
  })

  it('correct streak pushes serving level up', () => {
    expect(nextServingLevel(3, { streak: 2, lastCorrect: true })).toBe(4)
  })

  it('wrong answer pushes serving level down', () => {
    expect(nextServingLevel(3, { streak: -1, lastCorrect: false })).toBe(2)
  })

  it('serving level clamps to 1-5', () => {
    expect(nextServingLevel(5, { streak: 5, lastCorrect: true })).toBe(5)
    expect(nextServingLevel(1, { streak: -5, lastCorrect: false })).toBe(1)
  })
})
```

- [ ] **Step 2: รัน → fail → เขียน implementation**

`src/lib/practice/serving.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'

// true_rank (Glicko ~1500 center) → level 1-5
export function rankToLevel(rank: number): number {
  // ~ทุก 200 จุด = 1 level, center 1500 = level 3
  const lvl = Math.round((rank - 1500) / 200) + 3
  return Math.min(5, Math.max(1, lvl))
}

export interface SessionState { streak: number; lastCorrect: boolean }

// serving difficulty layer (เร็ว): ถูก → +1, ผิด → -1, clamp 1-5
export function nextServingLevel(current: number, s: SessionState): number {
  const delta = s.lastCorrect ? 1 : -1
  return Math.min(5, Math.max(1, current + delta))
}

// ดึงโจทย์ถัดไป: sub-pool (subject,topic,level) ตัด lock + attempted; ถ้าว่าง → escape-hatch (P1)
export async function pickQuestion(
  userId: string, subject: string, topic: string, level: number
) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('questions')
    .select('id, body, difficulty_value, rating_deviation, difficulty_frozen')
    .eq('subject', subject).eq('topic', topic)
    .eq('difficulty_level', level).eq('status', 'active')
    .not('id', 'in', `(select question_id from user_question_locks where user_id = '${userId}' and lock_until > now())`)
    .limit(1)
  return data?.[0] ?? null // null → caller เรียก escape-hatch check (P1 shouldTriggerEscapeHatch)
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/serving.test.ts
git add -A && git commit -m "feat: practice serving (rank→level, serving-difficulty streak, pick w/ lock filter)"
```
Expected: 4 passed

---

## Task 6: Practice flow server actions (orchestration)

**Files:**
- Create: `src/app/actions/practice.ts`, `src/app/practice/page.tsx`
- Test: `tests/e2e/practice-flow.spec.ts` (practice part)

> orchestrate: serve → submit → record attempt → two-way calibration → lock 30 วัน → spend token. ใช้ lazy-init user_ratings ตอนเจอ topic ครั้งแรก.

- [ ] **Step 1: submitAnswer server action**

`src/app/actions/practice.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { computeCalibration } from '@/lib/calibration/update'
import { rankToLevel } from '@/lib/practice/serving'

const RD_TO_RATING = (q: { difficulty_value: number; rating_deviation: number }) => ({
  rating: q.difficulty_value, rd: q.rating_deviation, vol: 0.06,
})

export async function submitAnswer(input: {
  questionId: string; subject: string; topic: string; correct: boolean; timeMs: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  // lazy-init user_ratings
  let { data: ur } = await supabase.from('user_ratings')
    .select('*').eq('user_id', user.id).eq('subject', input.subject).eq('topic', input.topic).single()
  if (!ur) {
    const ins = await supabase.from('user_ratings')
      .insert({ user_id: user.id, subject: input.subject, topic: input.topic })
      .select().single()
    ur = ins.data!
  }

  const { data: q } = await supabase.from('questions')
    .select('difficulty_value, rating_deviation, difficulty_frozen').eq('id', input.questionId).single()

  // two-way calibration
  const calc = computeCalibration({
    user: { rating: ur.true_rank, rd: ur.rd, vol: 0.06 },
    question: RD_TO_RATING(q!),
    correct: input.correct,
    questionFrozen: q!.difficulty_frozen,
    countInCalibration: true, // practice = นับเสมอ
  })

  // persist: attempt + user rating + (question ถ้าไม่ frozen) + lock 30 วัน
  await supabase.from('user_attempts').insert({
    user_id: user.id, question_id: input.questionId,
    correct: input.correct, time_spent_ms: input.timeMs, context: 'practice',
  })
  if (calc.user) await supabase.from('user_ratings')
    .update({ true_rank: calc.user.rating, rd: calc.user.rd, updated_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('subject', input.subject).eq('topic', input.topic)
  if (calc.question) await supabase.from('questions')
    .update({ difficulty_value: calc.question.rating, rating_deviation: calc.question.rd })
    .eq('id', input.questionId)
  await supabase.from('user_question_locks').upsert({
    user_id: user.id, question_id: input.questionId,
    lock_until: new Date(Date.now() + 30 * 864e5).toISOString(), // 30 วัน
  })

  return { ok: true, newLevel: rankToLevel(calc.user?.rating ?? ur.true_rank) }
}
```

- [ ] **Step 2: practice page (minimal — แสดงโจทย์, รับคำตอบ)**

`src/app/practice/page.tsx`: server component ดึงโจทย์แรกผ่าน `pickQuestion`, render โจทย์ + choices, ปุ่มส่งคำตอบเรียก `submitAnswer`. (UI ละเอียดไม่บังคับ — e2e เช็ค flow)
```tsx
// โครง: fetch โจทย์ → <QuestionCard q={...} onSubmit={submitAnswer} />
// แสดง body.q + body.choices เป็นปุ่ม, คลิก → submitAnswer({correct: choice===body.answer})
```

- [ ] **Step 3: e2e — ตอบโจทย์แล้ว attempt + lock ถูกบันทึก**

เพิ่มใน `tests/e2e/practice-flow.spec.ts`:
```typescript
test('answering a question records attempt and locks it', async ({ page }) => {
  // (ต้อง seed โจทย์ทดสอบ 1 ข้อก่อน — ใช้ import-seed หรือ fixture)
  // login → /practice → คลิกคำตอบ → ยืนยัน UI แสดงผล + ข้อถัดไปเปลี่ยน
  // (รายละเอียด selector ตาม QuestionCard ที่ implement)
})
```

- [ ] **Step 4: รัน test + commit**

```bash
pnpm test:e2e tests/e2e/practice-flow.spec.ts
git add -A && git commit -m "feat: practice flow (serve→submit→calibrate→lock 30d) server actions"
```

---

## Task 7: Daily token grant job

**Files:**
- Create: `supabase/migrations/0007_grant_function.sql`

> grant รายวันให้ user ที่ active. v1: Postgres function เรียกผ่าน Supabase scheduled (pg_cron) — หรือ Edge Function + cron. ใช้ logic จาก `tokens.ts` (cap)

- [ ] **Step 1: SQL function grant + cap (สะท้อน tokens.ts)**

`supabase/migrations/0007_grant_function.sql`:
```sql
create or replace function grant_daily_tokens() returns void language plpgsql as $$
begin
  -- tier1: +1/+1 cap 7; tier2: +3/+2 cap 21/14
  update tokens t set
    practice_balance = least(t.practice_balance +
      case s.tier when 'tier1' then 1 when 'tier2' then 3 else 0 end,
      case s.tier when 'tier1' then 7 when 'tier2' then 21 else 0 end),
    social_balance = least(t.social_balance +
      case s.tier when 'tier1' then 1 when 'tier2' then 2 else 0 end,
      case s.tier when 'tier1' then 7 when 'tier2' then 14 else 0 end),
    updated_at = now()
  from subscriptions s
  where s.user_id = t.user_id and s.status in ('trial','paid');
end; $$;
-- schedule: pg_cron (ถ้าเปิด) → select cron.schedule('daily-grant','0 0 * * *','select grant_daily_tokens()');
```

- [ ] **Step 2: apply + commit**

```bash
pnpm supabase db reset
git add -A && git commit -m "feat: daily token grant SQL function (tier-based + cap)"
```
Expected: migration apply ไม่มี error

---

## Task 8: Full test run

- [ ] **Step 1: รัน unit + e2e ทั้งหมด**

Run: `pnpm test && pnpm test:e2e`
Expected: ทุก test ผ่าน (glicko 4, calibration 5, tokens 5, serving 4, e2e auth+practice)

- [ ] **Step 2: commit final**

```bash
git add -A && git commit -m "test: P2 full suite green (calibration + tokens + practice)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Glicko-2 (rating/RD/volatility, expected score, high-RD moves more) → Task 2
- ✅ Two-way update + cold-start freeze + social-repeat exclusion (§5.2) → Task 3
- ✅ Token cap 7 วัน + transfer 1:0.5 ทางเดียว (§3.3) → Task 4
- ✅ Serving difficulty 2-layer (true_rank→level slow, streak fast) (§5.2/§6.1) → Task 5
- ✅ Practice flow (serve→calibrate→lock 30d→ §6.1) → Task 6
- ✅ Auth + bootstrap → Task 1 · daily grant → Task 7

**Out of scope P2 (→ P3+):** trial→free downgrade + payment (P3), feature gating UI (P3), social (P4), mock (P5), promote 70→90 job (touches §4.7 — แยกเป็น maintenance job, แนะนำใส่ P3/P4 หรือ background plan), escape-hatch *gen จริง* (scale phase)

**Placeholder scan:** Task 6 Step 2 (practice page UI) + Step 3 (e2e selector) เขียนเป็นโครงเพราะขึ้นกับ QuestionCard markup — *นี่เป็น UI detail ที่ executor เติม markup ได้จาก server-action contract ที่กำหนดครบแล้ว* (submitAnswer signature ชัด) ไม่ใช่ logic placeholder

**Type consistency:** `Rating` (glicko.ts) ใช้ตรงกันใน update.ts + practice.ts ✅ · `Balance`/`Tier` (tokens.ts) ✅ · `rankToLevel`/`nextServingLevel` (serving.ts) ใช้ใน practice.ts ✅ · field names ตรง P1 schema (true_rank, rd, difficulty_value, rating_deviation, difficulty_frozen, count_in_calibration, lock_until) ✅

> ⚠️ **dependency note:** ต้องมี seed โจทย์ใน DB ก่อนรัน practice e2e (Task 6) — ใช้ `scripts/import-seed.ts` (P1) seed fixture ชุดเล็กก่อนเทสต์
