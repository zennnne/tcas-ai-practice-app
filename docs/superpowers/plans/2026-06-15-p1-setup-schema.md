# P1: Project Setup + Schema Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** วาง foundation ของ TCAS app — repo, Next.js scaffold, Supabase local dev, test harness, DB schema ครบทุกตาราง (เผื่อ v1.1), seed-import script, escape-hatch hook — ให้ P2-P5 ต่อยอดได้

**Architecture:** Next.js (App Router, TypeScript) + Supabase (Postgres + Auth + Realtime) เป็น backend หลัก. Schema จัดการด้วย Supabase migrations (SQL). Logic ทดสอบด้วย Vitest (unit) + Playwright (e2e). Seed bank import ผ่าน Node script อ่าน JSON → upsert เข้า Supabase ผ่าน service-role client.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Supabase (CLI + JS client `@supabase/supabase-js`) · Vitest · Playwright · pnpm

> 📐 อ้างอิง design: `docs/superpowers/specs/2026-06-15-tcas-mvp-design.md` (§7 data model, §4 pipeline, §5 calibration fields)

---

## File Structure (สร้างใน plan นี้)

```
tcas-app/
├── package.json                      # deps + scripts
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.local                        # Supabase keys (ไม่ commit)
├── .env.example                      # template (commit)
├── .gitignore
├── supabase/
│   ├── config.toml                   # supabase init
│   └── migrations/
│       ├── 0001_content_schema.sql   # questions, locks, attempts
│       ├── 0002_user_calibration.sql # user_ratings, skill_tier
│       ├── 0003_tokens_subs.sql      # tokens, subscriptions
│       ├── 0004_social.sql           # rooms, room_participants
│       ├── 0005_quality.sql          # reports, ratings, goals
│       └── 0006_rls_policies.sql     # row-level security
├── src/
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts             # browser client
│   │       ├── server.ts             # server client (SSR)
│   │       └── admin.ts              # service-role client (scripts only)
│   └── types/
│       └── db.ts                     # generated DB types
├── scripts/
│   └── import-seed.ts                # JSON → Supabase upsert
└── tests/
    ├── unit/
    │   └── import-seed.test.ts
    └── e2e/
        └── smoke.spec.ts
```

แต่ละไฟล์ responsibility เดียว: migrations แยกตาม domain (content / calibration / tokens / social / quality), supabase clients แยกตาม context (browser/server/admin), import script standalone.

---

## Task 1: Repo + Next.js scaffold

**Files:**
- Create: `tcas-app/` (ทั้งโปรเจกต์), `.gitignore`

- [ ] **Step 1: สร้าง Next.js project**

Run (ในโฟลเดอร์ `TCAS AI Practice App`):
```bash
pnpm create next-app@latest tcas-app --typescript --app --no-tailwind --eslint --src-dir --import-alias "@/*" --use-pnpm
```
Expected: โฟลเดอร์ `tcas-app/` ถูกสร้าง พร้อม Next.js boilerplate

- [ ] **Step 2: git init + first commit**

Run:
```bash
cd tcas-app && git init && git add -A && git commit -m "chore: scaffold Next.js app (TypeScript, App Router)"
```
Expected: commit สำเร็จ (Next.js scaffold มี .gitignore ให้แล้ว — ยืนยันว่า `node_modules`, `.env*.local` อยู่ใน .gitignore)

- [ ] **Step 3: ยืนยัน dev server รันได้**

Run: `pnpm dev`
Expected: server ขึ้นที่ `http://localhost:3000` (Ctrl+C ออก) — ถ้าขึ้นได้ผ่าน

---

## Task 2: Supabase local dev

**Files:**
- Create: `tcas-app/supabase/config.toml`, `.env.local`, `.env.example`

- [ ] **Step 1: ติดตั้ง Supabase CLI + init**

Run:
```bash
pnpm add -D supabase
pnpm supabase init
```
Expected: `supabase/config.toml` ถูกสร้าง

- [ ] **Step 2: start Supabase local**

Run: `pnpm supabase start`
Expected: ขึ้น URL + anon key + service_role key (รอ Docker pull image รอบแรก) — คัดลอกค่าไว้

- [ ] **Step 3: สร้าง .env.local + .env.example**

`tcas-app/.env.local` (ใส่ค่าจริงจาก step 2):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key จาก supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — scripts เท่านั้น>
```
`tcas-app/.env.example` (commit ได้ — ไม่มีค่าจริง):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: ติดตั้ง supabase-js + commit**

Run:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
git add -A && git commit -m "chore: add Supabase local dev + env template"
```
Expected: commit สำเร็จ (ยืนยัน `.env.local` ไม่ถูก commit)

---

## Task 3: Supabase client helpers

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`

- [ ] **Step 1: browser client**

`src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: server client (SSR)**

`src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )
}
```

- [ ] **Step 3: admin client (service-role — scripts only)**

`src/lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

// ⚠️ service-role bypass RLS — ใช้เฉพาะใน scripts/ server-only ห้ามใน client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

- [ ] **Step 4: commit**

```bash
git add -A && git commit -m "feat: add Supabase client helpers (browser/server/admin)"
```

---

## Task 4: Test harness (Vitest + Playwright)

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: ติดตั้ง test deps**

Run:
```bash
pnpm add -D vitest @vitejs/plugin-react @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: vitest.config.ts**

`tcas-app/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: { alias: { '@': '/src' } },
})
```

- [ ] **Step 3: playwright.config.ts**

`tcas-app/playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:3000' },
})
```

- [ ] **Step 4: smoke e2e test**

`tests/e2e/smoke.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/) // any non-empty title
})
```

- [ ] **Step 5: เพิ่ม scripts ใน package.json**

แก้ `tcas-app/package.json` ส่วน `"scripts"` เพิ่ม:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"db:reset": "supabase db reset"
```

- [ ] **Step 6: รัน e2e ยืนยันผ่าน**

Run: `pnpm test:e2e`
Expected: 1 passed (home page loads)

- [ ] **Step 7: commit**

```bash
git add -A && git commit -m "test: add Vitest + Playwright harness with smoke test"
```

---

## Task 5: Content schema migration (questions / locks / attempts)

**Files:**
- Create: `supabase/migrations/0001_content_schema.sql`
- Test: `tests/unit/schema-content.test.ts`

- [ ] **Step 1: เขียน migration**

`supabase/migrations/0001_content_schema.sql`:
```sql
-- subjects/topics เก็บเป็น text (v1: 'math','physics'); 15 topics x 5 difficulty = 75 sub-pools
create table questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null,
  difficulty_level int not null check (difficulty_level between 1 and 5),
  difficulty_value double precision not null,          -- granular, calibrated
  rating_deviation double precision not null default 350, -- Glicko RD (สูง = ผันผวน)
  difficulty_frozen boolean not null default true,     -- cold-start anchor (§5.2)
  confidence_score double precision not null default 70,
  mock_eligible boolean not null default false,        -- derived: confidence >= 90
  curriculum_version text not null default 'tcas-2569',
  status text not null default 'active' check (status in ('active','suspended','removed')),
  body jsonb not null,                                 -- โจทย์ + choices + เฉลย + วิธีทำ
  created_at timestamptz not null default now()
);
create index questions_subpool_idx on questions (subject, topic, difficulty_level, status);

-- per-user lock: ทำแล้ว lock 30 วัน (practice เท่านั้น; social ไม่สน)
create table user_question_locks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  lock_until timestamptz not null,
  primary key (user_id, question_id)
);
create index locks_user_until_idx on user_question_locks (user_id, lock_until);

create table user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  correct boolean not null,
  time_spent_ms int,
  context text not null check (context in ('practice','social','mock')),
  count_in_calibration boolean not null default true,  -- false = social repeat-exposure (§5.2 W5)
  created_at timestamptz not null default now()
);
create index attempts_question_idx on user_attempts (question_id);
create index attempts_user_idx on user_attempts (user_id, created_at);
```

- [ ] **Step 2: apply migration**

Run: `pnpm supabase db reset`
Expected: migration apply สำเร็จ ไม่มี SQL error

- [ ] **Step 3: เขียน test ยืนยัน constraint (difficulty_level ต้อง 1-5)**

`tests/unit/schema-content.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('questions schema', () => {
  const db = createAdminClient()

  it('rejects difficulty_level out of 1-5 range', async () => {
    const { error } = await db.from('questions').insert({
      subject: 'math', topic: 'trig', difficulty_level: 9,
      difficulty_value: 9.0, body: {},
    })
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/difficulty_level/)
  })

  it('accepts a valid question with defaults', async () => {
    const { data, error } = await db.from('questions').insert({
      subject: 'math', topic: 'trig', difficulty_level: 3,
      difficulty_value: 3.0, body: { q: '1+1?', answer: '2' },
    }).select().single()
    expect(error).toBeNull()
    expect(data!.confidence_score).toBe(70)
    expect(data!.difficulty_frozen).toBe(true)
    expect(data!.status).toBe('active')
    // cleanup
    await db.from('questions').delete().eq('id', data!.id)
  })
})
```

- [ ] **Step 4: รัน test**

Run: `pnpm test tests/unit/schema-content.test.ts`
Expected: 2 passed

- [ ] **Step 5: commit**

```bash
git add -A && git commit -m "feat: content schema (questions, locks, attempts) + tests"
```

---

## Task 6: Calibration schema (user_ratings / skill_tier)

**Files:**
- Create: `supabase/migrations/0002_user_calibration.sql`
- Test: `tests/unit/schema-calibration.test.ts`

- [ ] **Step 1: เขียน migration**

`supabase/migrations/0002_user_calibration.sql`:
```sql
-- Glicko state ต่อ (user, subject, topic) — true rank (persistent layer §5.2)
create table user_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  true_rank double precision not null default 1500,    -- Glicko rating
  rd double precision not null default 350,             -- rating deviation (สูง = ใหม่/ผันผวน)
  updated_at timestamptz not null default now(),
  primary key (user_id, subject, topic)
);

-- skill tier 1-5 derived จาก true_rank (denormalized เพื่อ query/UX เร็ว)
create table skill_tier (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  tier int not null default 3 check (tier between 1 and 5),
  primary key (user_id, subject, topic)
);
```

- [ ] **Step 2: apply + test**

Run: `pnpm supabase db reset`
Expected: ไม่มี error

`tests/unit/schema-calibration.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('calibration schema', () => {
  const db = createAdminClient()
  let userId: string

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `cal-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('user_ratings defaults to Glicko start (1500, rd 350)', async () => {
    const { data, error } = await db.from('user_ratings').insert({
      user_id: userId, subject: 'math', topic: 'trig',
    }).select().single()
    expect(error).toBeNull()
    expect(data!.true_rank).toBe(1500)
    expect(data!.rd).toBe(350)
  })

  it('skill_tier rejects tier > 5', async () => {
    const { error } = await db.from('skill_tier').insert({
      user_id: userId, subject: 'math', topic: 'trig', tier: 7,
    })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/schema-calibration.test.ts
git add -A && git commit -m "feat: calibration schema (user_ratings Glicko, skill_tier) + tests"
```
Expected: 2 passed

---

## Task 7: Tokens + Subscriptions schema

**Files:**
- Create: `supabase/migrations/0003_tokens_subs.sql`
- Test: `tests/unit/schema-tokens.test.ts`

- [ ] **Step 1: migration**

`supabase/migrations/0003_tokens_subs.sql`:
```sql
create table tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  practice_balance double precision not null default 0,  -- double: รองรับโอน social→practice 1:0.5
  social_balance double precision not null default 0,
  updated_at timestamptz not null default now()
  -- cap 7 วัน worth บังคับใน application logic (P2/P3) ไม่ใช่ DB constraint
);

create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','tier1','tier2')),
  status text not null default 'trial'
    check (status in ('trial','trial_expired_free','free','paid')),
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 2: apply + test (status enum + transfer-rate precision)**

Run: `pnpm supabase db reset`

`tests/unit/schema-tokens.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

describe('tokens + subscriptions schema', () => {
  const db = createAdminClient()
  let userId: string

  beforeAll(async () => {
    const { data } = await db.auth.admin.createUser({
      email: `tok-${Date.now()}@test.local`, password: 'test123456', email_confirm: true,
    })
    userId = data.user!.id
  })

  it('subscriptions rejects invalid status', async () => {
    const { error } = await db.from('subscriptions').insert({
      user_id: userId, status: 'platinum',
    })
    expect(error).not.toBeNull()
  })

  it('tokens stores fractional balance (1 social → 0.5 practice)', async () => {
    const { data, error } = await db.from('tokens').insert({
      user_id: userId, practice_balance: 0.5, social_balance: 1,
    }).select().single()
    expect(error).toBeNull()
    expect(data!.practice_balance).toBe(0.5)
  })
})
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/schema-tokens.test.ts
git add -A && git commit -m "feat: tokens + subscriptions schema (trial states, fractional balance) + tests"
```
Expected: 2 passed

---

## Task 8: Social + Quality schema (rooms / reports / ratings / goals)

**Files:**
- Create: `supabase/migrations/0004_social.sql`, `supabase/migrations/0005_quality.sql`

- [ ] **Step 1: social migration**

`supabase/migrations/0004_social.sql`:
```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- private room join code
  host_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  settings jsonb not null,                   -- จำนวนข้อ/timer/mode/difficulty range
  question_ids uuid[] not null default '{}', -- ชุดโจทย์ที่สุ่มไว้ล่วงหน้า (fixed set)
  state text not null default 'waiting' check (state in ('waiting','in_progress','finished')),
  created_at timestamptz not null default now()
);

create table room_participants (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  finished_at timestamptz,
  primary key (room_id, user_id)
);
```

- [ ] **Step 2: quality migration**

`supabase/migrations/0005_quality.sql`:
```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,                    -- บังคับเลือก (anti-spam)
  weight double precision not null default 1,
  created_at timestamptz not null default now()
);

create table ratings (
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score text not null check (score in ('good','neutral','bad')),
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_faculty text,                       -- v1.1 slot
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 3: apply + commit**

Run: `pnpm supabase db reset`
Expected: ทุก migration apply ไม่มี error

```bash
git add -A && git commit -m "feat: social (rooms) + quality (reports, ratings, goals) schema"
```

---

## Task 9: RLS policies

**Files:**
- Create: `supabase/migrations/0006_rls_policies.sql`
- Test: `tests/unit/rls.test.ts`

- [ ] **Step 1: migration (เปิด RLS + policy พื้นฐาน)**

`supabase/migrations/0006_rls_policies.sql`:
```sql
-- questions: อ่านได้ทุกคน (authenticated) เฉพาะ active; เขียนผ่าน service-role เท่านั้น
alter table questions enable row level security;
create policy "read active questions" on questions
  for select to authenticated using (status = 'active');

-- user-owned tables: เจ้าของเท่านั้น
alter table user_question_locks enable row level security;
create policy "own locks" on user_question_locks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_attempts enable row level security;
create policy "own attempts" on user_attempts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_ratings enable row level security;
create policy "own ratings" on user_ratings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table tokens enable row level security;
create policy "own tokens" on tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table subscriptions enable row level security;
create policy "own subscription" on subscriptions
  for select to authenticated using (user_id = auth.uid());
```

- [ ] **Step 2: apply + test (anon อ่าน questions ไม่ได้, user เห็นแค่ของตัวเอง)**

Run: `pnpm supabase db reset`

`tests/unit/rls.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS', () => {
  // anon client (anon key, ไม่ login)
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  it('anon (unauthenticated) cannot read questions', async () => {
    const { data } = await anon.from('questions').select('*')
    expect(data).toEqual([]) // RLS ตัดทิ้ง (policy = authenticated only)
  })
})
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/rls.test.ts
git add -A && git commit -m "feat: RLS policies (own-row access, authenticated reads) + test"
```
Expected: 1 passed

---

## Task 10: Seed-import script (JSON → Supabase)

**Files:**
- Create: `scripts/import-seed.ts`
- Test: `tests/unit/import-seed.test.ts`

- [ ] **Step 1: เขียน test ก่อน (TDD) — parse + validate seed JSON**

`tests/unit/import-seed.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateSeedQuestion, type SeedQuestion } from '@/../scripts/import-seed'

describe('validateSeedQuestion', () => {
  const valid: SeedQuestion = {
    subject: 'math', topic: 'trig', difficulty_level: 3,
    body: { q: 'sin30?', choices: ['0.5','1'], answer: '0.5' },
  }

  it('accepts a valid seed question', () => {
    expect(validateSeedQuestion(valid)).toEqual({ ok: true })
  })

  it('rejects difficulty_level out of range', () => {
    const r = validateSeedQuestion({ ...valid, difficulty_level: 6 })
    expect(r.ok).toBe(false)
  })

  it('rejects missing answer in body', () => {
    const r = validateSeedQuestion({ ...valid, body: { q: 'x', choices: [] } as any })
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: รัน test ยืนยัน fail**

Run: `pnpm test tests/unit/import-seed.test.ts`
Expected: FAIL — "validateSeedQuestion is not a function" (ยังไม่เขียน)

- [ ] **Step 3: เขียน script + validator (minimal)**

`scripts/import-seed.ts`:
```typescript
import { readFileSync } from 'node:fs'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SeedQuestion {
  subject: string
  topic: string
  difficulty_level: number
  body: { q: string; choices: string[]; answer: string; solution?: string }
}

export function validateSeedQuestion(q: SeedQuestion): { ok: boolean; reason?: string } {
  if (q.difficulty_level < 1 || q.difficulty_level > 5)
    return { ok: false, reason: 'difficulty_level out of 1-5' }
  if (!q.body?.answer) return { ok: false, reason: 'missing answer' }
  if (!q.subject || !q.topic) return { ok: false, reason: 'missing subject/topic' }
  return { ok: true }
}

// seed difficulty_value = กลาง band ของ level (cold-start prior §5.1); frozen=true จนมีหลักฐาน
function seedDifficultyValue(level: number): number {
  return level // band กลาง = level เอง (scale tune ภายหลัง)
}

export async function importSeed(path: string) {
  const items: SeedQuestion[] = JSON.parse(readFileSync(path, 'utf-8'))
  const valid = items.filter((q) => validateSeedQuestion(q).ok)
  const rows = valid.map((q) => ({
    subject: q.subject, topic: q.topic,
    difficulty_level: q.difficulty_level,
    difficulty_value: seedDifficultyValue(q.difficulty_level),
    difficulty_frozen: true,
    confidence_score: 90,   // seed = พี่ verify มือ → ขึ้น mock-eligible ได้เลย
    mock_eligible: true,
    body: q.body,
  }))
  const db = createAdminClient()
  const { error } = await db.from('questions').insert(rows)
  if (error) throw error
  return { imported: rows.length, skipped: items.length - valid.length }
}

// CLI: pnpm tsx scripts/import-seed.ts <path.json>
if (process.argv[2]) {
  importSeed(process.argv[2]).then((r) => console.log('seed import:', r))
}
```

- [ ] **Step 4: รัน test ยืนยันผ่าน**

Run: `pnpm test tests/unit/import-seed.test.ts`
Expected: 3 passed

- [ ] **Step 5: เพิ่ม tsx + commit**

```bash
pnpm add -D tsx
git add -A && git commit -m "feat: seed-import script (validate + upsert, seed=confidence 90 mock-eligible) + tests"
```

---

## Task 11: Escape-hatch hook stub

**Files:**
- Create: `src/lib/content/escape-hatch.ts`
- Test: `tests/unit/escape-hatch.test.ts`

> design §4.2: real-time gen เฉพาะตอน pool จะว่างจริง + cost cap. P1 วางแค่ interface + cap-check; gen จริงต่อใน P2.

- [ ] **Step 1: test (cap logic)**

`tests/unit/escape-hatch.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { shouldTriggerEscapeHatch } from '@/lib/content/escape-hatch'

describe('shouldTriggerEscapeHatch', () => {
  it('fires when available=0 and under daily cap', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 0, todayCount: 2, dailyCap: 10 })).toBe(true)
  })
  it('does NOT fire when pool still has questions', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 3, todayCount: 0, dailyCap: 10 })).toBe(false)
  })
  it('does NOT fire when daily cap reached (cost guard)', () => {
    expect(shouldTriggerEscapeHatch({ availableForUser: 0, todayCount: 10, dailyCap: 10 })).toBe(false)
  })
})
```

- [ ] **Step 2: รัน → fail → เขียน implementation**

`src/lib/content/escape-hatch.ts`:
```typescript
export interface EscapeHatchInput {
  availableForUser: number // โจทย์ที่ user ยังไม่เจอใน sub-pool (หลัง lock filter)
  todayCount: number       // จำนวน real-time gen ที่ fire ไปแล้ววันนี้ (per sub-pool)
  dailyCap: number         // เพดานกัน cost ระเบิด
}

// fire เฉพาะตอน pool จะว่างจริงสำหรับ user + ยังไม่ชน cap (§4.2 C3)
export function shouldTriggerEscapeHatch(i: EscapeHatchInput): boolean {
  return i.availableForUser === 0 && i.todayCount < i.dailyCap
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/escape-hatch.test.ts
git add -A && git commit -m "feat: escape-hatch trigger logic (fire on empty pool, cap-guarded) + tests"
```
Expected: 3 passed

---

## Task 12: Full test run + README

**Files:**
- Create: `tcas-app/README.md`

- [ ] **Step 1: รัน test ทั้งหมด**

Run: `pnpm test && pnpm test:e2e`
Expected: ทุก unit + e2e test ผ่าน

- [ ] **Step 2: README (setup instructions)**

`tcas-app/README.md`:
```markdown
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
```

- [ ] **Step 3: commit**

```bash
git add -A && git commit -m "docs: add README with setup + seed import instructions"
```

---

## Self-Review

**Spec coverage (design doc §7 data model):**
- ✅ questions (difficulty_level + value + RD + frozen + mock_eligible + curriculum_version + status) → Task 5
- ✅ user_question_locks (per-user, lock_until) → Task 5
- ✅ user_attempts (context + count_in_calibration) → Task 5
- ✅ user_ratings (Glicko true_rank + rd) → Task 6
- ✅ skill_tier → Task 6
- ✅ tokens (fractional สำหรับ 1:0.5) → Task 7
- ✅ subscriptions (trial/trial_expired_free/free/paid) → Task 7
- ✅ rooms + room_participants (question_ids fixed set) → Task 8
- ✅ reports + ratings + goals → Task 8
- ✅ RLS → Task 9 · seed import (§4.3) → Task 10 · escape-hatch (§4.2) → Task 11

**Out of scope P1 (ไป P2+):** calibration *logic* (Glicko update), token *logic* (grant/spend/cap enforce/transfer), practice flow, adaptive serving, gen pipeline automation — P1 วางแค่ schema + interfaces

**Placeholder scan:** ไม่มี TODO/TBD ใน task — ทุก step มี code/command จริง ✅
**Type consistency:** `SeedQuestion`/`validateSeedQuestion` (Task 10), `EscapeHatchInput`/`shouldTriggerEscapeHatch` (Task 11) ใช้ชื่อตรงกันระหว่าง test/impl ✅ · field names ตรง migration ↔ test (difficulty_level, true_rank, rd, practice_balance) ✅

**Parallel track reminder:** seed bank gen (Claude Code + พี่ verify) ทำขนานได้ทันทีหลัง Task 10 (import script พร้อม) — ดู design §11
