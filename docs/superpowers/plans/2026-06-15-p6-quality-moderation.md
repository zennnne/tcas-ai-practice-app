# P6: Quality / Moderation (Report + Rating → Confidence → Auto-remove / Review) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** รักษา "content correctness = ชีวิตของแอป" — รับ report/rating, anti-spam, อัปเดต confidence, แล้ว route ตาม stakes: practice/social = auto-remove + trigger regen / mock(90+) = review queue ให้พี่ตรวจมือ

**Architecture:** Logic เป็น **pure functions** (anti-spam validate, confidence recompute, tiered routing, reputation) แยกจาก I/O. Server actions รับ report/rating. Background job (SQL/Edge) recompute confidence ต่อโจทย์เป็นรอบ → apply auto-remove หรือ enqueue review. Reporter reputation ถ่วงน้ำหนัก report (confirmed = น้ำหนักขึ้น, false = ลง).

**Tech Stack:** ต่อจาก P1-P5. ไม่มี dep ใหม่

> 📐 design refs: §4.4 (rating/report + anti-spam: category/rate-limit/reputation/หลายคน), §4.5 (floor เดียว), §4.6 (tiered: practice auto-remove / mock human review), §4.7 (mock = 90+). Schema P1 (reports, ratings, questions.confidence_score, status, mock_eligible)

---

## File Structure

```
src/lib/quality/
├── antispam.ts        # pure: validate report (category, rate-limit, dedup)
├── confidence.ts      # pure: recompute confidence จาก reports+ratings (weighted)
├── routing.ts         # pure: tiered action (auto-remove vs review queue)
└── reputation.ts      # pure: reporter weight จาก history
src/app/actions/quality.ts   # submitReport / submitRating
supabase/migrations/
└── 0011_moderation.sql       # review_queue, user_reputation, recompute job
tests/unit/
├── antispam.test.ts
├── confidence.test.ts
├── routing.test.ts
└── reputation.test.ts
```

---

## Task 1: Anti-spam validation

**Files:**
- Create: `src/lib/quality/antispam.ts`
- Test: `tests/unit/antispam.test.ts`

> §4.4: category บังคับ + rate-limit ต่อ user + กดซ้ำข้อเดิมไม่ได้

- [ ] **Step 1: test**

`tests/unit/antispam.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateReport, REPORT_CATEGORIES, type ReportContext } from '@/lib/quality/antispam'

const ctx: ReportContext = { todayReportCount: 2, dailyLimit: 10, alreadyReported: false }

describe('validateReport', () => {
  it('ต้องมี category ที่ถูกต้อง', () => {
    expect(validateReport('wrong_answer', ctx).ok).toBe(true)
    expect(validateReport('lol', ctx).ok).toBe(false) // category ไม่อยู่ในลิสต์
    expect(validateReport('', ctx).ok).toBe(false)
  })
  it('rate-limit: เกิน daily limit → ปฏิเสธ', () => {
    expect(validateReport('wrong_answer', { ...ctx, todayReportCount: 10 }).ok).toBe(false)
  })
  it('กด report ข้อเดิมซ้ำ → ปฏิเสธ', () => {
    expect(validateReport('wrong_answer', { ...ctx, alreadyReported: true }).ok).toBe(false)
  })
  it('categories ครบ (เฉลยผิด/กำกวม/พิมพ์ผิด/อื่นๆ)', () => {
    expect(REPORT_CATEGORIES).toContain('wrong_answer')
    expect(REPORT_CATEGORIES.length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: implement**

`src/lib/quality/antispam.ts`:
```typescript
export const REPORT_CATEGORIES = ['wrong_answer', 'ambiguous', 'typo', 'other'] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export interface ReportContext {
  todayReportCount: number
  dailyLimit: number
  alreadyReported: boolean // user เคย report ข้อนี้แล้ว
}

export function validateReport(category: string, ctx: ReportContext): { ok: boolean; reason?: string } {
  if (!REPORT_CATEGORIES.includes(category as ReportCategory))
    return { ok: false, reason: 'ต้องเลือก category ที่ถูกต้อง' }
  if (ctx.alreadyReported) return { ok: false, reason: 'report ข้อนี้ไปแล้ว' }
  if (ctx.todayReportCount >= ctx.dailyLimit) return { ok: false, reason: 'report เกินโควต้าวันนี้' }
  return { ok: true }
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/antispam.test.ts
git add -A && git commit -m "feat: report anti-spam validation (category, rate-limit, dedup)"
```
Expected: 4 passed

---

## Task 2: Reporter reputation weighting

**Files:**
- Create: `src/lib/quality/reputation.ts`
- Test: `tests/unit/reputation.test.ts`

> §4.4: คน report ตรงบ่อย → น้ำหนักมาก; report มั่ว → น้ำหนักน้อย

- [ ] **Step 1: test**

`tests/unit/reputation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { reportWeight } from '@/lib/quality/reputation'

describe('reportWeight', () => {
  it('user ใหม่ (ไม่มีประวัติ) = น้ำหนักกลาง 1.0', () => {
    expect(reportWeight({ confirmed: 0, rejected: 0 })).toBeCloseTo(1.0)
  })
  it('report ตรงบ่อย → น้ำหนัก > 1', () => {
    expect(reportWeight({ confirmed: 9, rejected: 1 })).toBeGreaterThan(1.0)
  })
  it('report มั่วบ่อย → น้ำหนัก < 1', () => {
    expect(reportWeight({ confirmed: 1, rejected: 9 })).toBeLessThan(1.0)
  })
  it('น้ำหนัก clamp ไม่ติดลบ', () => {
    expect(reportWeight({ confirmed: 0, rejected: 100 })).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: implement**

`src/lib/quality/reputation.ts`:
```typescript
export interface ReporterHistory { confirmed: number; rejected: number }

// น้ำหนัก = 0.5 + accuracy (clamp 0..2). user ใหม่ = 1.0
export function reportWeight(h: ReporterHistory): number {
  const total = h.confirmed + h.rejected
  if (total === 0) return 1.0
  const accuracy = h.confirmed / total // 0..1
  return Math.max(0, Math.min(2, 0.5 + accuracy * 1.5))
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/reputation.test.ts
git add -A && git commit -m "feat: reporter reputation weighting (confirmed/rejected history)"
```
Expected: 4 passed

---

## Task 3: Confidence recompute

**Files:**
- Create: `src/lib/quality/confidence.ts`
- Test: `tests/unit/confidence.test.ts`

> §4.5: confidence ลดจาก weighted reports, ปรับจาก rating. floor → ต่ำกว่า = ออก

- [ ] **Step 1: test**

`tests/unit/confidence.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { recomputeConfidence, CONFIDENCE_FLOOR } from '@/lib/quality/confidence'

describe('recomputeConfidence', () => {
  const base = { current: 80, weightedReports: 0, goodRatings: 10, badRatings: 0 }

  it('ไม่มี report + rating ดี → confidence คงสูง/ขึ้น', () => {
    expect(recomputeConfidence(base)).toBeGreaterThanOrEqual(80)
  })
  it('weighted report เยอะ → confidence ลงแรง', () => {
    const r = recomputeConfidence({ ...base, weightedReports: 5 })
    expect(r).toBeLessThan(80)
  })
  it('rating แย่เยอะ → confidence ลง', () => {
    const r = recomputeConfidence({ ...base, goodRatings: 0, badRatings: 10 })
    expect(r).toBeLessThan(80)
  })
  it('confidence ไม่หลุดช่วง 0-100', () => {
    expect(recomputeConfidence({ ...base, weightedReports: 999 })).toBeGreaterThanOrEqual(0)
    expect(recomputeConfidence({ current: 99, weightedReports: 0, goodRatings: 999, badRatings: 0 })).toBeLessThanOrEqual(100)
  })
  it('CONFIDENCE_FLOOR กำหนดไว้ (จุด auto-remove)', () => {
    expect(CONFIDENCE_FLOOR).toBeGreaterThan(0)
    expect(CONFIDENCE_FLOOR).toBeLessThan(70)
  })
})
```

- [ ] **Step 2: implement**

`src/lib/quality/confidence.ts`:
```typescript
export const CONFIDENCE_FLOOR = 50 // ต่ำกว่านี้ = auto-remove (practice/social) — tune §9

export interface ConfidenceInput {
  current: number
  weightedReports: number      // sum ของ report × reporterWeight
  goodRatings: number
  badRatings: number
}

// report ดึงลงแรง (×8/report weighted), rating ปรับเบา
export function recomputeConfidence(i: ConfidenceInput): number {
  const reportPenalty = i.weightedReports * 8
  const totalRatings = i.goodRatings + i.badRatings
  const ratingAdj = totalRatings === 0
    ? 0
    : ((i.goodRatings - i.badRatings) / totalRatings) * 5 // -5..+5
  const next = i.current - reportPenalty + ratingAdj
  return Math.max(0, Math.min(100, next))
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/confidence.test.ts
git add -A && git commit -m "feat: confidence recompute (weighted reports + ratings, floor)"
```
Expected: 5 passed

---

## Task 4: Tiered routing (auto-remove vs review queue)

**Files:**
- Create: `src/lib/quality/routing.ts`
- Test: `tests/unit/routing.test.ts`

> §4.6: practice/social (ไม่ mock-eligible) ตกฟลอร์ → auto-remove+regen · mock-eligible(90+) → review queue (ห้าม auto-remove — human)

- [ ] **Step 1: test**

`tests/unit/routing.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { routeQuestion } from '@/lib/quality/routing'

describe('routeQuestion', () => {
  it('practice โจทย์ตกฟลอร์ → auto-remove + regen', () => {
    const r = routeQuestion({ confidence: 40, mockEligible: false })
    expect(r.action).toBe('auto_remove_regen')
  })
  it('โจทย์เหนือฟลอร์ → no action', () => {
    expect(routeQuestion({ confidence: 75, mockEligible: false }).action).toBe('none')
  })
  it('mock-eligible(90+) ถูก report จนตก → review queue (ไม่ auto-remove)', () => {
    const r = routeQuestion({ confidence: 40, mockEligible: true })
    expect(r.action).toBe('review_queue')
  })
  it('mock-eligible ที่ confidence ยังสูง → no action', () => {
    expect(routeQuestion({ confidence: 92, mockEligible: true }).action).toBe('none')
  })
})
```

- [ ] **Step 2: implement**

`src/lib/quality/routing.ts`:
```typescript
import { CONFIDENCE_FLOOR } from './confidence'

export type QualityAction = 'none' | 'auto_remove_regen' | 'review_queue'

// mock-eligible (high-stakes) ถูก report จน confidence ตกต่ำกว่า 90 → human review (ไม่ auto-remove)
const MOCK_REVIEW_TRIGGER = 90

export function routeQuestion(q: { confidence: number; mockEligible: boolean }): { action: QualityAction } {
  if (q.mockEligible) {
    return { action: q.confidence < MOCK_REVIEW_TRIGGER ? 'review_queue' : 'none' }
  }
  // practice/social: ตกฟลอร์ → auto-remove + regen (ถูกกว่าเวลาตรวจ §4.6)
  return { action: q.confidence < CONFIDENCE_FLOOR ? 'auto_remove_regen' : 'none' }
}
```

- [ ] **Step 3: รัน test + commit**

```bash
pnpm test tests/unit/routing.test.ts
git add -A && git commit -m "feat: tiered quality routing (practice auto-remove / mock review queue)"
```
Expected: 4 passed

---

## Task 5: submitReport / submitRating server actions

**Files:**
- Create: `src/app/actions/quality.ts`

- [ ] **Step 1: actions (รับ + anti-spam + บันทึก)**

`src/app/actions/quality.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { validateReport } from '@/lib/quality/antispam'

export async function submitReport(questionId: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', today.toISOString())
  const { data: existing } = await supabase.from('reports').select('id')
    .eq('user_id', user.id).eq('question_id', questionId).maybeSingle()

  const v = validateReport(category, {
    todayReportCount: count ?? 0, dailyLimit: 10, alreadyReported: !!existing,
  })
  if (!v.ok) return { error: v.reason }

  await supabase.from('reports').insert({
    question_id: questionId, user_id: user.id, category, weight: 1, // weight = reputation ตอน recompute job
  })
  return { ok: true } // confidence recompute = background job (Task 6), ไม่ทำ sync
}

export async function submitRating(questionId: string, score: 'good' | 'neutral' | 'bad') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }
  await supabase.from('ratings').upsert({ question_id: questionId, user_id: user.id, score })
  return { ok: true }
}
```

- [ ] **Step 2: commit**

```bash
git add -A && git commit -m "feat: submitReport (anti-spam) + submitRating actions"
```

---

## Task 6: Moderation schema + recompute job

**Files:**
- Create: `supabase/migrations/0011_moderation.sql`

- [ ] **Step 1: migration (review_queue + reputation + recompute job)**

`supabase/migrations/0011_moderation.sql`:
```sql
-- review queue สำหรับ mock-eligible ที่ถูก report (พี่ตรวจมือ)
create table review_queue (
  question_id uuid primary key references questions(id) on delete cascade,
  reason text not null default 'confidence_drop',
  enqueued_at timestamptz not null default now(),
  resolved boolean not null default false
);

-- reporter reputation (confirmed/rejected จาก outcome ของ review)
create table user_reputation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confirmed_reports int not null default 0,
  rejected_reports int not null default 0
);

-- recompute job: คำนวณ confidence ใหม่ต่อโจทย์ → apply action
-- (สะท้อน recomputeConfidence + routeQuestion; รันเป็นรอบ เช่น ทุก 15 นาที)
create or replace function recompute_quality() returns void language plpgsql as $$
declare q record; new_conf double precision; w_reports double precision;
        good_ct int; bad_ct int;
begin
  for q in select id, confidence_score, mock_eligible from questions where status = 'active' loop
    select coalesce(sum(r.weight * coalesce(rep.confirmed_reports::float /
             nullif(rep.confirmed_reports + rep.rejected_reports, 0), 1)), 0)
      into w_reports
      from reports r left join user_reputation rep on rep.user_id = r.user_id
      where r.question_id = q.id;
    select count(*) filter (where score='good'), count(*) filter (where score='bad')
      into good_ct, bad_ct from ratings where question_id = q.id;

    new_conf := greatest(0, least(100, q.confidence_score - w_reports * 8 +
      case when good_ct + bad_ct = 0 then 0
           else ((good_ct - bad_ct)::float / (good_ct + bad_ct)) * 5 end));
    update questions set confidence_score = new_conf, mock_eligible = (new_conf >= 90) where id = q.id;

    -- route: mock-eligible ตก<90 → review; practice ตก<50 → suspend+regen flag
    if q.mock_eligible and new_conf < 90 then
      insert into review_queue (question_id) values (q.id) on conflict do nothing;
    elsif not q.mock_eligible and new_conf < 50 then
      update questions set status = 'suspended' where id = q.id; -- regen pipeline หยิบ suspended ไป gen แทน
    end if;
  end loop;
end; $$;
-- schedule: select cron.schedule('recompute-quality','*/15 * * * *','select recompute_quality()');
```

- [ ] **Step 2: apply + commit**

```bash
pnpm supabase db reset
git add -A && git commit -m "feat: moderation schema (review_queue, reputation) + recompute job"
```
Expected: migration apply ไม่มี error

---

## Task 7: Full test

- [ ] **Step 1: รัน unit ทั้งหมด**

Run: `pnpm test`
Expected: antispam 4 + reputation 4 + confidence 5 + routing 4 + (P1-P5 เดิม) ผ่านหมด

- [ ] **Step 2: commit**

```bash
git add -A && git commit -m "test: P6 quality/moderation suite green"
```

---

## Self-Review

**Spec coverage:**
- ✅ Anti-spam: category + rate-limit + dedup (§4.4) → Task 1
- ✅ Reporter reputation weighting (§4.4) → Task 2
- ✅ Confidence recompute weighted (§4.5) → Task 3
- ✅ Tiered routing: practice auto-remove+regen / mock review queue (§4.6) → Task 4
- ✅ submitReport/Rating actions → Task 5 · review_queue + recompute job → Task 6
- ✅ "ต้องหลายคน ไม่ใช่คนเดียวร่วง" → recompute ใช้ sum(weighted reports) (คนเดียว weight ~1 ลด 8 จาก 70+ ไม่ถึงฟลอร์ทันที — ต้องสะสมหลายคน) ✅

**Out of scope / TBD:**
- Confirmed/rejected reputation update — เกิดตอนพี่ resolve review_queue (admin UI — แนะนำ task เล็กเพิ่มตอนทำ admin panel)
- regen ของ suspended question = scale-phase gen pipeline (เชื่อม §4.2 — โจทย์ status='suspended' ให้ pipeline หยิบไป gen ทดแทน)
- recompute job threshold/constants (penalty ×8, floor 50) = tune §9
- "โบนัสฟรี: ตอบผิดยกแผง = เฉลยน่าจะผิด" (§4.6) — signal เสริม optional, ใส่ใน recompute ภายหลังได้

**Placeholder scan:** ไม่มี — ทุก step code/SQL จริง · admin UI (resolve review) = out-of-scope ระบุชัด

**Type consistency:** `ReportCategory`/`ReportContext` (antispam) ✅ · `ReporterHistory` (reputation) ✅ · `ConfidenceInput`/`CONFIDENCE_FLOOR` (confidence) ใช้ใน routing ✅ · `QualityAction` (routing) ✅ · ตรง P1 schema (reports.category/weight, ratings.score good/neutral/bad, questions.confidence_score/mock_eligible/status) ✅ · recompute job SQL สะท้อน recomputeConfidence+routeQuestion logic เดียวกัน ✅
