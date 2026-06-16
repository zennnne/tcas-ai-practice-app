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
**สถานะ:** pre-build / planning (ยังไม่มีโค้ด — มีเอกสาร + design doc + financial model)

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
  - commit/push เมื่อพี่ Zen สั่งเท่านั้น · ถ้าอยู่ `main` ให้ branch ก่อน
- ยังไม่มี codebase → เมื่อเริ่มเขียนโค้ด ให้ **อัปเดตไฟล์นี้** (build/test/run commands, โครงโฟลเดอร์, conventions จริง)
- `build_model.py` → reproduce financial model ได้ (แก้ assumptions ในชีต `Assumptions` แล้วเปิด Excel จะ recalc เอง)
- ก่อนเคลม "เสร็จ/ผ่าน" → verify จริง (รัน/ดู output) ตามนิสัยการทำงาน
