# CLAUDE.md — TCAS AI Practice App

คู่มือโปรเจกต์ (อ่านก่อนเริ่มทุกครั้ง) · Persona/ภาษา: ดู global `~/.claude/CLAUDE.md` (คาโฮะ, ไทย casual)

> 📐 **Design + invariants + schema + build order ฉบับเต็มล่าสุด:**
> `docs/superpowers/specs/2026-06-15-tcas-mvp-design.md` (ผ่าน brainstorming + grill + scrutiny)
> **Implementation plans (P1-P6, พร้อม execute):** `docs/superpowers/plans/2026-06-15-p*.md`
> — execute ด้วย `/executing-plans` (แนะนำ 1 session/plan, P1→P6) · seed bank = parallel track หลัง P1
> Product context → `tcas-app-product-doc.md` · Financial model → `TCAS Financial Model.xlsx` (สร้างจาก `build_model.py`)

---

## 1. โปรเจกต์

Subscription app ใช้ **AI ผลิตโจทย์** เตรียมสอบ **TCAS** (v1 = Math + Physics → Chem → Bio). รายได้ subscription + token-based.
**Solo founder** (พี่ Zen) → ทุก decision ต้อง "คนเดียวดูแลไหว"
**สถานะ:** กำลัง build P1 (Next.js + Supabase scaffold) — code อยู่ `tcas-app/` (repo เดียวกับ root นี้ ไม่แยก git)

---

## 2. หลักการตัดสินใจ (สำคัญสุด — guiding ทุก session)

1. **Solo-founder-friendly** — managed service > self-host
2. **Cost-sensitive** — ทุก AI call / infra กระทบ margin → พิจารณา Batch API, caching, cheaper tier เสมอ
3. **Conversion = ความเสี่ยงสูงสุด** — decision: build จริงแบบ **capital-light + บีบ burn** (bank เล็ก + parallel, organic growth) ไม่ทุ่ม bank ใหญ่ก่อนรู้ conversion · ⚠️ runway (model updated) **~80k worst case / Base ~18k** (ลดจาก ~180k เพราะ seed ผ่าน Claude Code) — conversion ยังเป็นความเสี่ยงหลัก
4. **Content correctness = ชีวิตของแอป** — "2 โมเดลตอบตรงกัน ≠ ถูก" → human spot-check ชั้น mock/90+
5. งาน design/architecture → เสนอ **option A/B/C + tradeoff** (พี่ Zen อยากเรียนรู้ไปด้วย)

---

## 3. Tech Stack

**Supabase** (DB + Realtime + Auth) · **Claude Sonnet** gen (Batch API) · verify cross-model · **web-first** (เลี่ยง App Store cut) · **Omise** (PromptPay/TrueMoney/card) — detail + verify 3-phase ดู design doc §8 / §4.3

> ⚠️ เขียนโค้ดเกี่ยว Claude/Anthropic API → อ่าน skill `claude-api` ก่อน (model id, pricing, batch, caching)

---

## 4. Invariants (guardrail — รายละเอียดเต็มใน design doc)

- **Mock = โจทย์ 90+ เท่านั้น** (high-stakes) · practice/social = ทุกตัวเหนือ floor (floor เดียว, ตก = auto-remove)
- **Token ทางเดียว:** social → practice ได้ (**1:0.5**) · practice → social **ไม่ได้** · สะสม cap 7 วัน · **free ไม่มี social** · ไม่มี win-streak bonus token
- **Content pipeline:** Claude gen → **blind-solve อิสระ** → ตรงกัน = pass (70+) / mismatch = regen → promote 90+ ตาม usage (verify 3-phase: seed=มือ / transition=Claude คนละรุ่น / scale=API)
- **Recycle lock per-user** (30 วันช่วง bank เล็ก, review กลับ 90 เมื่อ pool หนา) · *social ไม่สน lock*
- **Adaptive = Glicko-2 2-layer** — true rank (ช้า) + serving difficulty (เร็ว); difficulty แยก **level** (bucket stable) + **value** (calibrate + RD)
- Question bank: **15 topics × 5 difficulty = 75 sub-pools/วิชา**

---

## 5. Working conventions

- **GitHub:** `zennnne/tcas-ai-practice-app` (🔒 private) · default branch `main` · remote `origin` (https) · gh CLI login แล้ว
  - `.gitignore` กัน secrets (`.env`/`*.key`/`service-account*.json`), Python/Node cache, Supabase temp ไว้แล้ว → อย่า commit secret ขึ้นไป
  - commit/push เมื่อพี่ Zen สั่งเท่านั้น
  - **solo workflow:** งานเล็ก/docs/bugfix ชัดเจน → commit `main` ตรงได้ · branch เฉพาะงานใหญ่/เสี่ยง/อยากรีวิวก่อน merge (เช่น feature ใหม่, schema change, refactor ใหญ่)
  - ⚠️ guard ของ Claude Code อาจยังเตือนตอน push ตรง `main` — ยืนยันได้เลยถ้าตั้งใจ
- `build_model.py` → reproduce financial model ได้ (แก้ assumptions ในชีต `Assumptions` แล้วเปิด Excel จะ recalc เอง)
- ก่อนเคลม "เสร็จ/ผ่าน" → verify จริง (รัน/ดู output) ตามนิสัยการทำงาน

## 6. Codebase (`tcas-app/`)

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Postgres + Auth, local dev ผ่าน Docker) · Vitest (unit) · Playwright (e2e) · pnpm

**Commands** (รันใน `tcas-app/`):
- `pnpm install` · `pnpm supabase start` (ต้องเปิด Docker Desktop ก่อน) → คัดลอก keys ใส่ `.env.local`
- `pnpm supabase db reset` — apply migrations ใหม่ทั้งหมด
- `pnpm dev` — ใช้ `--webpack` เสมอ (Turbopack panic กับ path ที่มีอักษรไทย เช่น `เดสก์ท็อป` — อย่าเปลี่ยนกลับ)
- `pnpm test` (unit) · `pnpm test:e2e` (Playwright, auto spawn dev server)

**โครงโฟลเดอร์:**
- `supabase/migrations/0001-0006` — content / calibration / tokens+subs / social / quality / RLS (เรียงตามลำดับ apply)
- `src/lib/supabase/{client,server,admin}.ts` — browser / SSR / service-role (admin ใช้เฉพาะ scripts ห้ามฝั่ง client)
- `scripts/import-seed.ts` — seed bank JSON → Supabase (`pnpm tsx scripts/import-seed.ts <path>`)
- `tests/unit/` (Vitest, มี DB jest ผ่าน admin client) · `tests/e2e/` (Playwright)

**Gotcha ที่เจอจริงตอน build P1:**
- pnpm บล็อก postinstall scripts โดย default ตอนนี้ (`sharp`, `unrs-resolver`, `esbuild`) → ต้อง `allowBuilds: true` ใน `pnpm-workspace.yaml`
- Supabase local CLI ตัวใหม่ออก key 2 แบบ (`PUBLISHABLE_KEY`/`SECRET_KEY` ใหม่ + `ANON_KEY`/`SERVICE_ROLE_KEY` JWT เดิม) — โค้ดใน repo อ้าง legacy JWT keys (ใช้กับ `@supabase/ssr`/`supabase-js` ได้ปกติ)
- **Postgres GRANT ≠ RLS bypass:** service_role bypass RLS แต่ยังต้องมี `grant select/insert/update/delete ... to service_role` ต่อตารางเสมอ ไม่งั้น "permission denied" — ทุก migration ใน `supabase/migrations/` มี grant block ต่อท้ายแล้ว
- Vitest ไม่โหลด `.env.local` ให้ auto ต้องมี `loadEnv` (จาก `vite`, ไม่ใช่ `vitest/config`) ใน `vitest.config.ts`
