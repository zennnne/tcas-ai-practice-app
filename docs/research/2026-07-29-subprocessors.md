# Sub-processors / บริการภายนอก + PDPA cross-border (issue #17)

วันที่วิจัย: 2026-07-29 · ขอบเขต: โค้ดจริงใน `tcas-app/` ณ commit `f53573b` (branch `main`)
ทุกข้อเท็จจริงเรื่องนิติบุคคล / region / DPA อ้างอิงเอกสารทางการของผู้ให้บริการ (ลิงก์ในแต่ละ section)

> ⚠️ เอกสารนี้เป็น **research note** ไม่ใช่คำแนะนำทางกฎหมาย — ก่อนเผยแพร่นโยบายจริงควรให้ทนาย/ที่ปรึกษา PDPA ตรวจ

---

## 0. สรุปสถานะการใช้งานจริงใน repo

| เจ้า | ใช้จริงไหม | หลักฐาน |
|---|---|---|
| Supabase | ✅ ใช้ (DB + Auth หลัก) | `tcas-app/package.json:18-19`, `tcas-app/src/lib/supabase/{client,server,admin}.ts` |
| Omise | ✅ ใช้ (payment) | `tcas-app/package.json:22`, `tcas-app/src/lib/billing/omise.ts:1-6` |
| Sentry | ✅ ใช้ (error monitoring) | `tcas-app/package.json:16-17`, `tcas-app/src/lib/monitoring/sentry-init.ts:13-21` |
| Resend | ✅ ใช้ (transactional email) | `tcas-app/package.json:26`, `tcas-app/src/lib/email/send.ts:47-57` |
| PostHog | ✅ ใช้ (analytics, server-side only) | `tcas-app/package.json:23`, `tcas-app/src/lib/analytics/capture.ts:30-32` |
| Upstash Redis | ✅ ใช้ (rate limit + cost guardrail) — ผ่าน REST fetch ไม่ได้ลง SDK | `tcas-app/src/lib/rate-limit/store.ts:20-39` |
| Anthropic | ❌ **ยังไม่ถูกเรียกในโค้ด** — มีแค่ env var รอ gen pipeline | `tcas-app/.env.example:47-51`; grep `anthropic` ใน `src/` = ไม่พบ |
| Vercel (host) | ⚠️ **ยังไม่ผูก** — ไม่มี `vercel.json` / `.vercel/` ใน repo, มีแค่คอมเมนต์อ้างถึง | `tcas-app/src/app/api/jobs/trial-reminders/route.ts:10`, `tcas-app/docs/runbook-backup-restore.md:66`, `.gitignore:37-38` |

---

## 1. ตารางสรุป

| ผู้ให้บริการ | นิติบุคคล (ใช้เขียนลงนโยบายได้) | ประเทศจดทะเบียน/ที่ตั้ง | บทบาท | ข้อมูลส่วนบุคคลที่ถูกส่งไป (จากโค้ดจริง) | region เก็บข้อมูล | เลือก region ได้? | DPA |
|---|---|---|---|---|---|---|---|
| Supabase | Supabase, Inc. (privacy notice) / **SUPABASE PTE. LTD.** (คู่สัญญาใน ToS) | สหรัฐฯ / สิงคโปร์ | Processor (customer data) + Controller (บัญชีลูกค้า) | อีเมล, password hash, user UUID, consent, ผลทำโจทย์/คะแนน, subscription | เลือกได้ตอนสร้าง project (มี ap-southeast-1 สิงคโปร์) — **ไม่มี region ไทย** | ✅ | ✅ ลงนามผ่าน PandaDoc จาก dashboard |
| Omise | **Omise Co., Ltd.** | 🇹🇭 ไทย (กรุงเทพฯ) | **Controller ของตัวเอง** (ไม่ใช่ processor เรา) | user UUID (metadata), tier, จำนวนเงิน, payment token/บัตร/PromptPay (ผู้ใช้กรอกฝั่ง Omise) | ไทยเป็นหลัก แต่ policy สงวนสิทธิ์ส่งออกนอกประเทศไปบริษัทในกลุ่ม/คลาวด์ | ❌ | ผูกผ่าน MSA/ToS (ไม่มีหน้า DPA self-serve) |
| Sentry | **Functional Software, Inc.** d/b/a Sentry | 🇺🇸 สหรัฐฯ (San Francisco, CA) | Processor | stack trace, URL, user id/อีเมลที่หลุดมากับ `extra` (ดู §4 ความเสี่ยง) | US (Iowa) หรือ EU (Frankfurt) | ✅ แต่ **เลือกครั้งเดียวตอนสร้าง org เปลี่ยนไม่ได้** | ✅ auto-incorporate |
| Resend | **Plus Five Five, Inc.** (d/b/a Resend) | 🇺🇸 สหรัฐฯ (San Francisco, CA) | Processor | **อีเมลผู้ใช้** + เนื้อหาเมล (tier, วันที่, วันเหลือของ trial) | สหรัฐฯ | ❌ | ✅ binding อัตโนมัติ + ดึงจาก dashboard |
| PostHog | **PostHog, Inc.** | 🇺🇸 สหรัฐฯ (San Francisco, CA) | Processor | user UUID (distinctId) + event name + properties (tier, trial_days) — **ไม่มีอีเมล** | US Cloud (default ในโค้ด) หรือ EU Cloud (Frankfurt) | ✅ ตอนสร้าง project (ย้ายทีหลังยาก) | ✅ generate + countersign ใน app |
| Upstash | **Upstash, Inc.** (Delaware corporation) | 🇺🇸 สหรัฐฯ | Processor | **IP address ของผู้ใช้** + user id ที่ฝังใน key ของ counter | เลือก region ตอนสร้าง DB (มี ap-southeast-1 สิงคโปร์) | ✅ | ✅ DPA PDF |
| Anthropic | **Anthropic, PBC** (EEA/UK = Anthropic Ireland, Limited) | 🇺🇸 สหรัฐฯ | Processor | *ยังไม่มี* — แผนคือส่งเฉพาะ prompt/โจทย์ ไม่มี PII ผู้ใช้ | สหรัฐฯ | ❌ | ✅ incorporate by reference |
| Vercel (ถ้าเลือก) | **Vercel Inc.** (Delaware corporation, reg. 5857312) | 🇺🇸 สหรัฐฯ | Processor | ทุก request → IP, headers, cookie session, log | สหรัฐฯ เป็นหลัก (เลือก edge/function region ได้ แต่ log/ควบคุมอยู่ US) | บางส่วน | ✅ auto-incorporate |

---

## 2. รายละเอียดต่อเจ้า

### 2.1 Supabase — DB + Auth (ตัวหลัก, ข้อมูลเยอะสุด)

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- Auth: อีเมล + รหัสผ่าน → `auth.users` ของ Supabase (`tcas-app/src/lib/supabase/server.ts`, การ signup ใน `src/app/actions/auth.ts`); โค้ดอ่านอีเมลกลับมาที่ `tcas-app/src/app/api/webhooks/omise/route.ts:61-62`
- ข้อมูลพฤติกรรมการเรียน: `user_attempts` (user_id, question_id, correct, time_spent_ms, context) — `tcas-app/supabase/migrations/0001_content_schema.sql:28-37`
- lock ต่อผู้ใช้ `user_question_locks` — `0001_content_schema.sql:20-25`
- token / subscription (tier, status, trial_ends_at) — `tcas-app/supabase/migrations/0003_tokens_subs.sql:1-16`
- consent log (user_id, policy_version, consented_at) — `tcas-app/supabase/migrations/0014_consents.sql:6-11`
- ✅ ตรวจแล้วไม่มีคอลัมน์ชื่อจริง/โรงเรียน/เบอร์/วันเกิดใน migrations (grep `display_name|school|birth|phone|full_name` = ไม่พบ) → PII หลัก = **อีเมล + user UUID + ข้อมูลผลการเรียน**

**บทบาท:** privacy notice ระบุชัดว่าสำหรับ Customer Data นั้น "We use such Customer Data primarily as a processor… on behalf of and under the instructions of the relevant customer" และเป็น controller สำหรับข้อมูลบัญชีของเราเอง — https://supabase.com/privacy

**นิติบุคคล:** privacy notice ใช้ชื่อ "Supabase, Inc." (สหรัฐฯ) แต่ **Terms of Service ระบุคู่สัญญาเป็น "SUPABASE PTE. LTD., a Singapore entity, 65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513"** (governing law = California) — https://supabase.com/terms
→ ⚠️ ก่อนเขียนนโยบาย ให้ยึดชื่อที่ปรากฏบน DPA ที่เราเซ็นจริง (ดึงจาก dashboard)

**Region:** เลือกได้ตอนสร้าง project; รายการ region มี APAC Southeast Asia = Singapore (`ap-southeast-1`), Tokyo, Sydney ฯลฯ — **ไม่มี region ในประเทศไทย** → https://supabase.com/docs/guides/platform/regions
เปลี่ยน region ภายหลังต้อง migrate ใหม่ → https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z

**DPA:** https://supabase.com/legal/dpa — มี PDF ให้อ่าน (https://supabase.com/downloads/docs/Supabase+DPA+250314.pdf) และต้อง **เซ็นผ่าน PandaDoc** ที่ขอจากหน้า legal documents ใน dashboard; มี Transfer Impact Assessment เผยแพร่ด้วย (https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf)
**Sub-processor list สาธารณะ:** ❌ ไม่พบหน้า public list (`/legal/subprocessors` = 404) — รายชื่ออยู่ใน Annex ของ DPA ที่ต้องขอ; privacy notice ระบุผู้ให้บริการ เช่น AWS, Google Cloud, Stripe, Twilio, Postmark, OpenAI

---

### 2.2 Omise — payment (นิติบุคคลไทย ✅)

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- `tcas-app/src/app/actions/billing.ts:12-17` → `omise.charges.create({ amount, currency:'thb', source: token, metadata: { user_id, tier } })` — ส่ง **user UUID ของเรา** เข้าไปใน metadata + จำนวนเงิน + payment source token
- ข้อมูลบัตร/PromptPay ผู้ใช้กรอกฝั่ง Omise.js แล้วได้ token กลับมา (ไม่ผ่าน server เรา) — key ฝั่ง client `NEXT_PUBLIC_OMISE_PUBLIC_KEY` ที่ `tcas-app/.env.example:26`
- webhook รับกลับ: event id + metadata → `tcas-app/src/app/api/webhooks/omise/route.ts:16-20`

**นิติบุคคล (จาก Privacy Policy ทางการ ver. 20251006):**
"Omise Co., Ltd. 1448/4 J2 Building, Crystal Design Center (CDC), Soi Ladprao 87 (Chandrasuk), Praditmanutham Road, Khongchan, Bangkapi, Bangkok 10240 Thailand" · ติดต่อ privacy@opn.ooo
→ PDF: https://cdn.omise.co/assets/screenshots/Legal%20Documents/Omise-Privacy-Policy-ver-20251006.pdf (ลิงก์จากหน้า https://docs.omise.co/privacy/thailand ซึ่ง embed PDF ใน iframe)

**บทบาท:** Omise เก็บและใช้ข้อมูลตาม **นโยบายของตัวเอง** (มีสิทธิ์ของเจ้าของข้อมูล/การถอนความยินยอม/ช่องทางร้องเรียนเป็นของตัวเอง) → ในทางปฏิบัติควรระบุว่าเป็น **ผู้ควบคุมข้อมูลส่วนบุคคลอีกราย (แยกต่างหาก)** ไม่ใช่ผู้ประมวลผลของเรา — ประเภทข้อมูลที่เขาเก็บตามนโยบาย ได้แก่ Identity, Contact, Transaction, **Financial (cardholder name, card number, expiry, CVV, PromptPay number)**, Technical (IP, MAC, device), Service Account Information

**Cross-border (สำคัญ):** ข้อ 5 "Cross-Border Transfer" ของนโยบายระบุว่า
> "We may transmit your Personal Data outside of Thailand, Japan, Singapore, Malaysia to SYNQA Group Companies, Omise Group Companies and/or OPN Group Companies, as well as our service providers who provide IT infrastructure and technological services, including data center, cloud platform or having their servers located in other countries."
พร้อมคำมั่นว่าจะทำให้ถูกกฎหมายและบังคับ sub-processor ให้มีมาตรการคุ้มครองที่เหมาะสม
→ แม้ Omise เป็นบริษัทไทย **ก็ยังมีการส่งออกนอกประเทศได้** ต้องระบุในนโยบายเรา

**DPA:** ไม่มีหน้า DPA self-serve สาธารณะ — ความสัมพันธ์อยู่ใต้ MSA/T&C ไทย (https://docs.omise.co/msa/thailand, https://docs.omise.co/terms/thailand) และ Omise บังคับให้ merchant มี privacy policy บนเว็บ (https://docs.omise.co/what-are-the-required-policies-on-the-merchants-website)

---

### 2.3 Sentry — error monitoring

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- init: `sendDefaultPii: false`, `tracesSampleRate: 0`, มี `beforeSend: scrubPii` ที่ลบ `email/password/token` **เฉพาะใน `event.request.data`** — `tcas-app/src/lib/monitoring/sentry-init.ts:13-35`
- ⚠️ **ช่องโหว่ที่พบ:** `captureMessage(..., { extra: context })` ไม่ถูก scrub และมีจุดที่ยัด PII เข้าไปตรงๆ:
  - `tcas-app/src/lib/email/send.ts:50` และ `:84` → ส่ง `{ to, subject }` / `{ type, to, error }` คือ **อีเมลผู้ใช้ ออกไป Sentry (สหรัฐฯ)**
  - `tcas-app/src/app/api/webhooks/omise/route.ts:49-52, 70-73` → `userId`
  - `tcas-app/src/app/api/jobs/trial-reminders/route.ts:47-50` → `userId`
  → ควรแก้ให้ scrub `event.extra` ด้วย หรือเลิกส่ง `to` (แนะนำเป็น follow-up issue) ไม่งั้นต้องประกาศในนโยบายว่าอีเมลถูกส่งไปยังผู้ให้บริการ monitoring ในสหรัฐฯ

**นิติบุคคล/บทบาท:** "Functional Software, Inc. d/b/a Sentry, 45 Fremont Street, 8th Floor, San Francisco, CA 94105"; DPA ระบุตรงๆ ว่า "Sentry is a Processor of Personal Data and Customer is the Controller" — https://sentry.io/legal/dpa/
**Region:** เลือกได้ระหว่าง **US (Iowa)** กับ **EU (Frankfurt)** ตอนสร้าง organization และ **เปลี่ยนไม่ได้** ("once selected, your data storage location can't be changed") — https://docs.sentry.io/organization/data-storage-location/
**Sub-processors:** https://sentry.io/legal/subprocessors/ (v2.3.0, 1 มิ.ย. 2026) — AWS, Cloudflare, Google LLC (EU/US), Anthropic PBC, OpenAI, Intercom, Twilio SendGrid, Sinch Mailgun + affiliate ที่ออสเตรีย/แคนาดา/เนเธอร์แลนด์
**Transfer:** อาศัย EU-US Data Privacy Framework + SCCs

---

### 2.4 Resend — transactional email

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- `tcas-app/src/lib/email/send.ts:55` → `resend.emails.send({ from, to, subject, html })` — **อีเมลผู้ใช้ (to)** + เนื้อหาที่มี tier + วันที่ (`send.ts:26-40`)
- caller: receipt หลังจ่ายเงิน `tcas-app/src/app/api/webhooks/omise/route.ts:60-68`; trial reminder แบบ batch ดึงอีเมลจาก RPC `get_trial_reminder_candidates` แล้วส่งทีละคน `tcas-app/src/app/api/jobs/trial-reminders/route.ts:24-42`

**นิติบุคคล/บทบาท:** "Plus Five Five, Inc." (d/b/a Resend), 2261 Market Street #5039, San Francisco, CA — เป็น processor สำหรับ customer data และเป็น controller อิสระสำหรับ account/usage data ของตัวเอง — https://resend.com/legal/dpa
**Region:** "Company's primary processing operations take place in the United States" — ไม่มีตัวเลือก region สาธารณะ
**DPA:** binding อัตโนมัติเมื่อเข้าทำสัญญา ดึงฉบับ executed จาก dashboard ได้ — https://resend.com/legal/dpa
**Sub-processors:** https://resend.com/legal/subprocessors — ทั้งหมดอยู่ **USA** (AWS, Cloudflare, PlanetScale, Vercel, Supabase, Stripe, Datadog, Anthropic PBC, RunPod ฯลฯ) แจ้งล่วงหน้า 14 วันก่อนเปลี่ยน

---

### 2.5 PostHog — analytics

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- `tcas-app/src/lib/analytics/capture.ts:21-32` → `client.capture({ distinctId, event, properties })`
- distinctId = **Supabase user UUID** (pseudonymous ไม่ใช่อีเมล): `tcas-app/src/lib/auth/provision.ts:19-20` (`signup`, `trial_started` + `trial_days`), `tcas-app/src/app/actions/billing.ts:19` (`upgrade_started` + tier), `tcas-app/src/app/api/webhooks/omise/route.ts:57` (`subscription_paid` + tier)
- เป็น **server-side (posthog-node) ล้วน** — ไม่มี posthog-js ฝั่ง browser → ไม่มี auto-capture IP/cookie จาก client
- doc comment ยืนยันว่าทุก call site อยู่หลัง consent check (`capture.ts:11-16`) — สอดคล้องกับ `consents` table

**นิติบุคคล/บทบาท:** "PostHog, Inc., 2261 Market St., #4008, San Francisco, CA 94114" — processor (ลูกค้าเป็น controller) — https://posthog.com/dpa
**Region:** default ในโค้ดคือ **US Cloud** (`https://us.i.posthog.com` — `capture.ts:4`, `tcas-app/.env.example:65`) · มี EU Cloud (AWS eu-central-1 Frankfurt) เป็นทางเลือก — https://posthog.com/blog/posthog-cloud-eu · ย้าย region ทีหลังยาก/จำกัดเฉพาะ plan ใหญ่ — https://posthog.com/docs/migrate/migrate-to-cloud
**DPA:** generate + countersign ในบัญชี (app.posthog.com/legal) — https://posthog.com/dpa
**Sub-processors:** https://posthog.com/subprocessors — AWS / PlanetScale / Modal (US หรือ Germany ตาม region ที่เลือก), Cloudflare (global edge), Wiz (DE/FR)

---

### 2.6 Upstash Redis — rate limit + cost guardrail

**ข้อมูลที่ส่งไป (โค้ดจริง)**
- `tcas-app/src/lib/rate-limit/store.ts:24-34` → REST `POST {url}/pipeline` ด้วย `INCRBY key` + `EXPIRE`
- key มี **identity ฝังอยู่**: `rl:${cls}:${key}:${windowNum}` — `tcas-app/src/lib/rate-limit/limiter.ts:56` โดย key = userId หรือ **IP address** (`tcas-app/src/lib/rate-limit/ip.ts:5-17` ดึงจาก `x-forwarded-for`)
  → **IP address = ข้อมูลส่วนบุคคล** ต้องประกาศ
- cost guardrail ใช้ key แบบ `cost:${kind}:${day}` ไม่มี PII — `tcas-app/src/lib/cost-guardrail/guardrail.ts:119`
- ⚠️ ค่าที่เก็บเป็นแค่ counter + TTL สั้น (auth window 15 นาที + 60 วิ)

**นิติบุคคล:** "Upstash, Inc., a Delaware corporation d/b/a Upstash" — https://upstash.com/trust/privacy.pdf, https://upstash.com/trust/terms.pdf
**Region:** เลือก region ตอนสร้าง database; รายการมี **AWS ap-southeast-1 (Singapore)** — https://upstash.com/docs/common/concepts/global-replication · privacy policy ระบุว่าลูกค้าเลือก deploy Customer Data ในภูมิภาคที่กำหนดได้
**DPA:** https://upstash.com/trust/dpa.pdf (อัปเดต เม.ย. 2025) · **Sub-processors:** https://trust.upstash.com/subprocessors และ PDF https://upstash.com/static/trust/subprocessors.pdf · compliance page: https://upstash.com/docs/common/help/compliance · อ้าง EU-U.S. Data Privacy Framework

---

### 2.7 Anthropic (Claude) — ยังไม่ได้ใช้จริง

**สถานะโค้ด:** ไม่มีการเรียก API ใดๆ — grep `anthropic` ใน `tcas-app/src/` ไม่พบ; มีแค่ `ANTHROPIC_API_KEY` ใน `tcas-app/.env.example:47-51` ที่เขียนกำกับว่า "The gen pipeline itself is NOT built yet"
→ **ตอนนี้ยังไม่ต้องประกาศเป็น sub-processor** แต่เตรียมไว้ เพราะ gen pipeline คือ track ถัดไป

**นิติบุคคล:** "Anthropic, PBC" (สำหรับลูกค้าทั่วไป) / "Anthropic Ireland, Limited" (EEA/สวิส/UK) — https://www.anthropic.com/legal/commercial-terms
**บทบาท:** "Anthropic is Customer's processor" — https://www.anthropic.com/legal/data-processing-addendum (มีผล 24 ก.พ. 2025, incorporate by reference เข้ากับ Commercial Terms)
**Sub-processors:** https://www.anthropic.com/subprocessors (redirect → https://trust.anthropic.com/subprocessors)
**Region/retention:** ประมวลผลในสหรัฐฯ; input/output ของ API ถูกลบภายใน **30 วัน** (ยกเว้นกรณีละเมิด usage policy เก็บได้ถึง 2 ปี) — https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data · ไม่เทรนโมเดลบน Customer Content (commercial terms) · มีตัวเลือก zero-data-retention — https://docs.anthropic.com/en/docs/build-with-claude/zero-data-retention
**คำแนะนำออกแบบ:** ให้ pipeline ส่งเฉพาะ prompt/โจทย์ **ห้ามส่ง user id/อีเมล/ผลสอบรายบุคคล** → Anthropic จะไม่กลายเป็น sub-processor ของข้อมูลส่วนบุคคลเลย ทำให้นโยบายง่ายลงมาก

---

### 2.8 Host / Vercel — ยังไม่ผูก (ต้องตัดสินใจ)

**สถานะ:** ไม่มี `vercel.json` / `.vercel/` ใน repo; อ้างถึงแค่ในคอมเมนต์ (`tcas-app/src/app/api/jobs/trial-reminders/route.ts:10` "e.g. Vercel Cron or pg_cron") และ runbook (`tcas-app/docs/runbook-backup-restore.md:66`)
**ถ้าเลือก Vercel:** "Vercel Inc., a Delaware corporation (registered number 5857312)" เป็น **processor** (Pro/Enterprise), DPA binding อัตโนมัติเมื่อเข้าทำสัญญา — https://vercel.com/legal/dpa · sub-processor list ที่ https://security.vercel.com · ประมวลผลหลักในสหรัฐฯ + โอนไปที่อื่นได้ทั่วโลก, ใช้ SCCs 2021 / UK IDTA · infra บน AWS + Azure + GCP
**หมายเหตุ:** host จะเห็น **ทุก request** (IP, headers, cookie session, log) → เป็น sub-processor ที่ต้องประกาศแน่นอน; ถ้าอยากลด cross-border ควรเทียบ region ของ function/edge ตอนตั้งค่า

---

## 3. ข้อสรุป — ข้อมูลออกนอกประเทศไทยไหม?

**ออกแน่นอน และออกหลายทาง** — ปัจจุบัน (จากโค้ดที่ merge แล้ว) ไม่มีผู้ให้บริการรายไหนเก็บข้อมูลใน **ประเทศไทย** เลย:

| ข้อมูล | ไปไหน |
|---|---|
| อีเมล + รหัสผ่าน + ผลการเรียนทั้งหมด | Supabase — สิงคโปร์ (ถ้าเลือก ap-southeast-1) หรือ US |
| อีเมล + เนื้อหาใบเสร็จ/เตือน trial | Resend — **สหรัฐฯ** |
| อีเมล (หลุดผ่าน error context) + user id + stack trace | Sentry — US (Iowa) หรือ EU (Frankfurt) |
| user UUID + event การใช้งาน | PostHog — **US Cloud** (ค่า default ในโค้ด) |
| IP address + user id (counter) | Upstash — region ที่เลือก (สิงคโปร์ได้) |
| user UUID + ข้อมูลการชำระเงิน | Omise — ไทย แต่ policy สงวนสิทธิ์ส่งออกนอกประเทศ |
| ทุก request (IP, session) | host (Vercel = สหรัฐฯ) |

### ต้องเขียนอะไรในนโยบาย (PDPA)

1. **ระบุรายชื่อผู้รับข้อมูล** (ตอนนี้หน้า `/privacy` ยังเป็น placeholder ทั้งหมด — `tcas-app/src/app/privacy/page.tsx:31-64`) → เติมชื่อนิติบุคคล + ประเทศ + ประเภทข้อมูล ตามตาราง §1
2. **ประกาศการส่งหรือโอนข้อมูลไปต่างประเทศ (ม.28/29)** — ระบุประเทศปลายทาง (สหรัฐฯ, สิงคโปร์, เยอรมนี) และ **ฐานรองรับ** ที่ใช้:
   - ม.28: ประเทศปลายทางมีมาตรฐานคุ้มครองเพียงพอ (สหรัฐฯ **ยังไม่อยู่ในรายชื่อที่ คกก. ไทยประกาศ** → พึ่งข้อนี้ไม่ได้แบบสบายใจ)
   - ม.28(1) ความยินยอมโดยชัดแจ้งหลังแจ้งให้ทราบถึงมาตรฐานที่ไม่เพียงพอ ← ทางที่ใช้ได้จริงที่สุดตอนนี้ (มี consent flow + `consents` table อยู่แล้ว)
   - ม.28(3) จำเป็นเพื่อปฏิบัติตามสัญญากับเจ้าของข้อมูล ← ใช้ได้กับ Supabase/host/Omise (ให้บริการแอป + จ่ายเงิน) แต่ **อ่อน** สำหรับ analytics/monitoring
   - ม.29: ใช้ BCR/มาตรการคุ้มครองที่เหมาะสม (SCCs ในแต่ละ DPA) — Supabase/Sentry/Resend/PostHog/Upstash/Vercel มี SCCs หมด → อ้างเป็น "มาตรการคุ้มครองที่เหมาะสม" ได้
3. **ทำ DPA ให้ครบก่อน launch** (checklist): Supabase (PandaDoc) · PostHog (countersign ใน app) · Upstash (PDF) · Sentry / Resend / Vercel (auto แต่ควรดาวน์โหลดเก็บหลักฐาน) · Omise = MSA
4. **แยกบทบาท Omise ให้ชัด** — เขียนในนโยบายว่าเมื่อชำระเงิน ข้อมูลบัตร/PromptPay จะถูกเก็บและใช้โดย **Omise Co., Ltd. ในฐานะผู้ควบคุมข้อมูลอีกราย** ตามนโยบายของ Omise (แนบลิงก์) — เราไม่เคยเห็นเลขบัตร
5. **แจ้งสิทธิ + ช่องทาง** (ม.30-36) และ **ผู้เยาว์ ม.20** — ผู้ใช้หลักคือเด็ก ม.ปลาย อายุ < 20 ปี → เป็นประเด็นใหญ่ที่สุดที่ต้องให้ทนายดู (ยังเป็น placeholder ที่ `privacy/page.tsx:52-55`)
6. **บันทึกเวอร์ชันนโยบาย** — เมื่อเขียนเนื้อหาจริงต้องขยับ `PRIVACY_VERSION` เป็น `privacy_v2` (`tcas-app/src/lib/consent/consent.ts`) เพื่อ re-consent ผู้ใช้เดิม

### Action items ที่พบระหว่างวิจัย (แนะนำเปิดเป็น issue แยก)

- 🔴 **PII leak → Sentry:** `tcas-app/src/lib/email/send.ts:50,84` ส่งอีเมลผู้ใช้เข้า Sentry `extra` ซึ่ง `scrubPii` ไม่ครอบคลุม (`sentry-init.ts:24-35` scrub เฉพาะ `event.request.data`) → แก้เป็น hash/ตัด หรือขยาย scrub ไป `event.extra`
- 🟡 เลือก region ให้ครบก่อนสร้าง org/project จริง (Sentry เปลี่ยนไม่ได้, PostHog ย้ายยาก, Supabase/Upstash เลือกสิงคโปร์ได้)
- 🟡 ตัดสินใจ host + ผูก DPA
- 🟢 ออกแบบ gen pipeline ให้ไม่ส่ง PII ไป Anthropic ตั้งแต่วันแรก
