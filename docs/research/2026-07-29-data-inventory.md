# Data Inventory — ข้อมูลส่วนบุคคลที่แอปเก็บ (PDPA ม.23)

> **Issue:** #16 · **วันที่สำรวจ:** 2026-07-29 · **Commit ที่อ่าน:** working tree บน `main` (หลัง `f53573b`)
> **ขอบเขต:** `tcas-app/supabase/migrations/0001`–`0015` + โค้ดใน `tcas-app/src/`
> **วิธี:** อ่าน schema + call site จริงทั้งหมด ทุกแถวอ้าง `path:line` ได้ — ไม่มีการเดา
> path ทั้งหมดเป็น repo-relative จาก root `TCAS AI Practice App/`

---

## 1. ตาราง inventory หลัก

| ประเภทข้อมูล | เก็บที่ไหน (ตาราง.คอลัมน์ / บริการ) | เกิดตอนไหน (flow/ไฟล์) | อ่อนไหวตาม ม.26? |
|---|---|---|---|
| **อีเมล** | Supabase Auth `auth.users.email` (managed schema, ไม่ได้ประกาศใน migration ของเรา) | สมัครสมาชิก — `supabase.auth.signUp({email, password})` · `tcas-app/src/app/actions/auth.ts:23` (ฟอร์ม `tcas-app/src/app/(auth)/signup/page.tsx:47-56`) | ไม่ |
| **รหัสผ่าน (hash)** | Supabase Auth `auth.users.encrypted_password` (Supabase จัดการ hash เอง) | สมัคร/ล็อกอิน — `actions/auth.ts:23`, `actions/auth.ts:35` · นโยบายความยาวขั้นต่ำ 6 ตัว `tcas-app/supabase/config.toml` `[auth] minimum_password_length = 6` | ไม่ |
| **user id (UUID)** | `auth.users.id` + FK แทบทุกตาราง (`tokens.user_id`, `user_attempts.user_id`, ฯลฯ) | ออกโดย Supabase ตอน signUp; ใช้ต่อทุก flow ผ่าน `withAuth` `tcas-app/src/lib/auth/with-auth.ts:57-58` | ไม่ |
| **Session / refresh token, last sign-in, IP+User-Agent ของ session** | Supabase Auth managed (`auth.sessions`, `auth.refresh_tokens`, `auth.audit_log_entries`) — **ไม่มี migration ฝั่งเรา**; session token เก็บเป็น **cookie** บน browser | ทุกครั้งที่ล็อกอิน/รีเฟรช — cookie อ่าน/เขียนที่ `tcas-app/src/lib/supabase/server.ts:10-17`; อายุ JWT 3600s + rotation `tcas-app/supabase/config.toml` `[auth] jwt_expiry`, `enable_refresh_token_rotation` | ไม่ |
| **IP address (ชั่วคราว, rate limit)** | **Upstash Redis** — key `rl:auth:<ip>:<window>` (TTL = window 15 นาที + 60 วิ) ไม่ลง DB เรา | ทุก signup/login — `getClientIP()` `tcas-app/src/lib/rate-limit/ip.ts:5-9` → `checkIpRateLimit` `ip.ts:12-17` → key ประกอบที่ `tcas-app/src/lib/rate-limit/limiter.ts:60`, TTL `limiter.ts:62` | ไม่ |
| **ความยินยอม PDPA + เวอร์ชันนโยบาย** | `consents.user_id`, `consents.policy_version`, `consents.consented_at` — `tcas-app/supabase/migrations/0014_consents.sql:6-11` | ตอนสมัคร หลัง signUp สำเร็จ — `tcas-app/src/lib/auth/provision.ts:17`; validate ก่อนสร้าง user `tcas-app/src/lib/consent/consent.ts:38-52` · เวอร์ชันปัจจุบัน `privacy_v1+terms_v1` `consent.ts:13-23` | ไม่ |
| **สถานะสมาชิก / tier / trial** | `subscriptions.tier`, `.status`, `.trial_ends_at`, `.updated_at` — `tcas-app/supabase/migrations/0003_tokens_subs.sql:9-16` · `+ .trial_reminder_sent_at` `0015_trial_reminder_sent.sql:4-5` | สร้างตอน provision `provision.ts:14-16`; อัปเดตตอนจ่ายเงินสำเร็จ `tcas-app/src/app/api/webhooks/omise/route.ts:39-43`; หมด trial อัตโนมัติ `0008_trial_downgrade.sql:1-4` | ไม่ |
| **ยอด token คงเหลือ** | `tokens.practice_balance`, `.social_balance`, `.updated_at` — `0003_tokens_subs.sql:1-7` | สร้างตอน provision `provision.ts:13`; แจกรายวัน `0007_grant_function.sql:3-17`; หักตอน join ห้อง `tcas-app/src/lib/social/join.ts:16-24` | ไม่ |
| **ประวัติการตอบโจทย์ (ถูก/ผิด) + บริบท** | `user_attempts.user_id`, `.question_id`, `.correct`, `.context` (`practice`/`social`/`mock`), `.count_in_calibration`, `.created_at` — `0001_content_schema.sql:28-37` | ตอบโจทย์ practice `tcas-app/src/app/actions/practice.ts:11-20` · social `tcas-app/src/app/actions/social.ts:23-33` · mock (bulk) `tcas-app/src/lib/attempts/record.ts:124-129` — insert จริงที่ `record.ts:92-96` | **มีความเสี่ยง** — เป็นข้อมูลผลการเรียน/ความสามารถ ไม่ใช่ ม.26 โดยตรง (ดู §4) |
| **เวลาที่ใช้ต่อข้อ (ms)** | `user_attempts.time_spent_ms` — `0001_content_schema.sql:33` | practice `actions/practice.ts:17` และ social `actions/social.ts:28` ส่ง `timeMs`; **mock ไม่ส่ง** (bulk insert ไม่มีฟิลด์นี้ `record.ts:124-129`) | ไม่ |
| **ระดับความสามารถ (Glicko rating)** | `user_ratings.true_rank`, `.rd`, `.updated_at` ต่อ (user, subject, topic) — `0002_user_calibration.sql:2-10` | lazy-init ครั้งแรกที่ตอบโจทย์ `record.ts:29-31`; อัปเดตทุก attempt ที่ `count_in_calibration=true` `record.ts:81-83` และ mock batch `record.ts:150-152` | **มีความเสี่ยง** (โปรไฟล์ความสามารถ) — ไม่ใช่ ม.26 |
| **skill tier 1–5 (derived)** | `skill_tier.tier` — `0002_user_calibration.sql:13-19` | อ่านตอนสร้างห้อง social `tcas-app/src/lib/social/create-room.ts:19-21` (ยังไม่พบโค้ดที่ *เขียน* ตารางนี้ — ดู §5) | ไม่ |
| **โจทย์ที่ทำไปแล้ว (recycle lock)** | `user_question_locks.user_id`, `.question_id`, `.lock_until` — `0001_content_schema.sql:20-25` | ตอบ practice เท่านั้น (`applyLock: true`) `record.ts:98-103`, `actions/practice.ts:19` | ไม่ |
| **คณะ/มหาวิทยาลัยที่เล็ง (เป้าหมาย)** | `goals.user_id`, `.target_faculty`, `.updated_at` — `0005_quality.sql:18-22` | ผู้ใช้กรอกก่อนเริ่ม mock `tcas-app/src/app/mock/page.tsx:39` → `setGoal()` `tcas-app/src/app/actions/mock.ts:6-13` | ไม่ (แต่ดู §4 — สื่อถึงความคาดหวัง/สถานะการศึกษา) |
| **คะแนน mock + โอกาสติดคณะ (band)** | **ไม่ persist** — คำนวณแล้วส่งกลับ client เท่านั้น `tcas-app/src/lib/mock/submit.ts:20-35` (ที่ลง DB คือ attempts รายข้อ) | ตอน submit mock `actions/mock.ts:24-31` | ไม่ |
| **รายงานคุณภาพโจทย์ (report)** | `reports.user_id`, `.question_id`, `.category`, `.weight`, `.created_at` — `0005_quality.sql:1-8` | ผู้ใช้กด report `tcas-app/src/app/actions/quality.ts:5-8` → `tcas-app/src/lib/quality/report.ts` | ไม่ |
| **เรตติ้งโจทย์ (good/neutral/bad)** | `ratings.user_id`, `.question_id`, `.score`, `.created_at` — `0005_quality.sql:10-16` | `actions/quality.ts:10-15` | ไม่ |
| **คะแนนความน่าเชื่อถือของผู้รายงาน** | `user_reputation.user_id`, `.confirmed_reports`, `.rejected_reports` — `0011_moderation.sql:10-14` | อ่าน/ถ่วงน้ำหนักในจ็อบ `recompute_quality()` `0011_moderation.sql:28-35`; ค่าถูกตั้งจากผลรีวิวมือ (ยังไม่มีโค้ด TS ที่เขียน — §5) | ไม่ |
| **ห้องแข่ง social ที่สร้าง (host)** | `rooms.host_id`, `.code`, `.subject`, `.settings`, `.question_ids`, `.state`, `.created_at` — `0004_social.sql:1-10` | สร้างห้อง `tcas-app/src/lib/social/create-room.ts:29-33` (เรียกจาก `actions/social.ts:7-12`) | ไม่ |
| **การเข้าร่วมห้อง + คะแนนในห้อง** | `room_participants.room_id`, `.user_id`, `.score`, `.finished_at` — `0004_social.sql:12-18` | join ด้วย social token `tcas-app/src/lib/social/join.ts:23` | ไม่ |
| **user_id + เวลาตอบ ที่ broadcast ให้ผู้เล่นคนอื่นเห็น (real-time)** | **Supabase Realtime** channel `room:<code>` — payload `{userId, qIndex, correct, timeMs}`; แสดง `userId` บน leaderboard | หน้าห้อง social `tcas-app/src/app/social/room/[code]/page.tsx:12`, `:33-46`, แสดงผลที่ `:114` และ `:164` | ไม่ (แต่เป็นการ **เปิดเผยต่อผู้ใช้อื่น** — ดู §4) |
| **บันทึกเหตุการณ์ชำระเงิน (dedup)** | `processed_webhook_events.event_id`, `.event_key`, `.processed_at` — `0012_webhook_idempotency.sql:3-6` — **ไม่มี user_id** | รับ webhook จาก Omise `api/webhooks/omise/route.ts:25-27` | ไม่ |
| **ข้อมูลบัตร/ช่องทางชำระเงิน** | **อยู่ที่ Omise ล้วน** — ฟอร์มบัตรเป็น Omise.js iframe (`https://cdn.omise.co/omise.js`) แลกเป็น token ฝั่ง client `tcas-app/src/app/upgrade/UpgradeClient.tsx:50-66`; เซิร์ฟเวอร์เราส่งต่อ token ให้ `omise.charges.create` `tcas-app/src/app/actions/billing.ts:12-17` **ไม่เก็บ token/charge id ลง DB** (ส่งกลับ client เพื่อ redirect เท่านั้น `billing.ts:20`) | flow อัปเกรด | ไม่ (แต่เป็นข้อมูลการเงิน — ต้องระบุ Omise เป็นผู้ประมวลผล) |
| **ข้อมูลที่ส่งไป Omise (user_id + tier)** | Omise charge metadata `{user_id, tier}` — `billing.ts:16`; ส่งกลับมาทาง webhook `tcas-app/src/lib/billing/webhook.ts:5-6, 22-26` | ตอนกดจ่ายเงิน | ไม่ |
| **อีเมลที่ส่งออก (ใบเสร็จ / เตือนหมด trial)** | **Resend** (ผู้ให้บริการอีเมล) — รับ `to` = อีเมลผู้ใช้ `tcas-app/src/lib/email/send.ts:47-57` | ใบเสร็จหลังจ่ายเงินสำเร็จ (ดึงอีเมลจาก `auth.users` ผ่าน admin API `api/webhooks/omise/route.ts:61-68`) · เตือน trial ใกล้หมด `api/jobs/trial-reminders/route.ts:42` (ดึงอีเมลผ่าน SQL `get_trial_reminder_candidates` ที่ join `auth.users u` `0015_trial_reminder_sent.sql:17-18`) | ไม่ |
| **Analytics event ผูก user_id** | **PostHog** — `distinctId = user_id`; events: `signup`, `trial_started` (`provision.ts:19-20`), `upgrade_started` + `{tier}` (`billing.ts:19`), `subscription_paid` + `{tier}` (`api/webhooks/omise/route.ts:57`) | 4 จุดข้างต้นเท่านั้น (ตรวจครบด้วย grep `capture(`) · ตัวส่ง `tcas-app/src/lib/analytics/capture.ts:21-36` | ไม่ |
| **Error / log ฝั่ง server** | **Sentry** — `sendDefaultPii: false`, `tracesSampleRate: 0`, มี `beforeSend` ลบ `email`/`password`/`token` ออกจาก request body `tcas-app/src/lib/monitoring/sentry-init.ts:13-35` | ทุก unhandled error + `captureMessage` ที่วางไว้ · **ข้อยกเว้นสำคัญ: มี user_id และ "อีเมล" หลุดเข้า extras** (ดู §3) | ไม่ (โดยตั้งใจ) |
| **Console log ฝั่งเซิร์ฟเวอร์ (Vercel/host log)** | log ของ hosting — มี `user_id` และ `event_id` | `console.error('webhook: dedup insert error', …)` `api/webhooks/omise/route.ts:30` และ `console.error('webhook: no subscription row for user', intent.userId, …)` `route.ts:48` | ไม่ |
| **ตัวนับ cost guardrail** | Upstash Redis key `cost:<kind>:<YYYY-MM-DD>` — **รวมทั้งระบบ ไม่ผูก user** `tcas-app/src/lib/cost-guardrail/guardrail.ts:118-124` | ก่อนยิง AI gen (pipeline ยังไม่สร้าง) | ไม่ |
| **ตัวนับ rate limit ต่อ user** | Upstash Redis key `rl:<class>:<userId>:<window>` `limiter.ts:60` (key = userId จาก `with-auth.ts:65`) | ทุก server action ที่ผ่าน `withAuth` | ไม่ |

**ตารางที่ไม่มีข้อมูลส่วนบุคคล** (ตรวจแล้ว): `questions` `0001:2-16`, `faculty_cutoffs` `0009:1-5`, `review_queue` `0011:2-7`, `processed_webhook_events` `0012:3-6` (ไม่มี user_id)

---

## 2. ผู้ประมวลผล/ผู้รับข้อมูลภายนอก (สำหรับหัวข้อ "การเปิดเผยข้อมูล")

จาก `tcas-app/.env.example` + call site จริง:

| บริการ | ข้อมูลที่ไหลไป | อ้างอิง |
|---|---|---|
| **Supabase** (DB + Auth + Realtime) | ทุกอย่างในตาราง §1 + email/password hash/session/IP ระดับ Auth | `.env.example` `NEXT_PUBLIC_SUPABASE_URL`, `src/lib/supabase/{client,server,admin}.ts` |
| **Omise** | token บัตร/PromptPay/TrueMoney (ไม่ผ่านเซิร์ฟเวอร์เรา), จำนวนเงิน, metadata `{user_id, tier}` | `UpgradeClient.tsx:50-66`, `actions/billing.ts:12-17` |
| **Resend** | อีเมลผู้ใช้ + เนื้อหาใบเสร็จ/เตือน trial | `lib/email/send.ts:47-57` |
| **PostHog** | user_id (distinctId) + 4 funnel events + `tier`/`trial_days` | `lib/analytics/capture.ts:21-36` |
| **Sentry** | error/stack + context ที่แนบ (มี user_id; และ **อีเมล** ใน 2 จุด — §3) | `lib/monitoring/sentry-init.ts`, `lib/monitoring/capture.ts` |
| **Upstash Redis** | IP address (ชั่วคราว, TTL สั้น) + user_id counter | `lib/rate-limit/store.ts:20-39`, `lib/rate-limit/ip.ts:5-9` |
| **Anthropic (Claude)** | ⚠️ ยังไม่มีโค้ดจริง — pipeline gen ยังไม่สร้าง (`.env.example` ระบุ `ANTHROPIC_API_KEY` + หมายเหตุ "NOT built yet") ปัจจุบัน **ไม่มีข้อมูลผู้ใช้ส่งไป Anthropic** | `.env.example` §Anthropic |

---

## 3. จุดที่ PII รั่วเกินความจำเป็น (ควรแก้ก่อนประกาศนโยบาย)

1. **อีเมลผู้ใช้ถูกส่งเข้า Sentry** — `captureMessage('email: RESEND_API_KEY not set…', 'warning', { to, subject })` `tcas-app/src/lib/email/send.ts:50` และ `captureMessage('email: send failed', 'error', { type, to, … })` `send.ts:84` โดย `to` คืออีเมลจริง. `scrubPii` ทำงานเฉพาะ `event.request.data` ไม่แตะ `extra` → **อีเมลหลุดเข้า Sentry จริง** (`sentry-init.ts:24-35`)
2. **user_id ลง Sentry extras** หลายจุด — `api/webhooks/omise/route.ts:50`, `route.ts:71`, `api/jobs/trial-reminders/route.ts:47` (ถือว่าเป็น pseudonymous แต่ควรระบุในนโยบาย)
3. **user_id UUID ถูกแสดงให้ผู้เล่นคนอื่นเห็น** บน leaderboard ห้อง social `src/app/social/room/[code]/page.tsx:114, 164` — เป็นการเปิดเผยต่อบุคคลที่สาม (ผู้ใช้อื่น) ต้องเขียนในนโยบาย

---

## 4. ประเมิน "ข้อมูลอ่อนไหว" ตาม PDPA ม.26

ม.26 ครอบคลุม: เชื้อชาติ/เผ่าพันธุ์, ความคิดเห็นทางการเมือง, ความเชื่อลัทธิ/ศาสนา/ปรัชญา, พฤติกรรมทางเพศ, ประวัติอาชญากรรม, ข้อมูลสุขภาพ, ความพิการ, ข้อมูลสหภาพแรงงาน, ข้อมูลพันธุกรรม, ข้อมูลชีวภาพ

**ผลตรวจ: ไม่พบคอลัมน์ใดในสคีมาที่เข้าข่าย ม.26 เลย** — ไม่มีเลขบัตรประชาชน, วันเกิด, ชื่อ-นามสกุล, เพศ, ที่อยู่, เบอร์โทร, รูปโปรไฟล์, biometrics ที่ไหนในทั้ง 15 migration หรือฟอร์มใดๆ (ฟอร์มสมัครเก็บแค่ email + password `(auth)/signup/page.tsx:47-70`)

ข้อควรระวัง (ไม่ใช่ ม.26 แต่ควรเขียนในนโยบายให้ชัด):
- **ข้อมูลผลการเรียน/ความสามารถ** (`user_attempts`, `user_ratings`, `skill_tier`) — ละเอียดอ่อนในทางปฏิบัติ เป็นโปรไฟล์ความสามารถรายบุคคล และเป็นฐานของการทำ profiling (adaptive serving)
- **`goals.target_faculty`** — สื่อถึงเป้าหมาย/สถานะการศึกษา
- **ผู้เยาว์ (< 20 ปี)** — กลุ่มผู้ใช้หลักคือนักเรียน ม.ปลาย แต่ **ยังไม่มีกลไก parental consent ตาม ม.20 เลย** และไม่เก็บอายุ/วันเกิดจึงตรวจไม่ได้ ระบุไว้เป็น TODO ที่ `src/lib/consent/consent.ts:9-10` และ `(auth)/signup/page.tsx` (คอมเมนต์ในบล็อก consent) — **นี่คือช่องว่างที่ใหญ่ที่สุดในเชิงกฎหมาย**

---

## 5. ช่องว่าง / ข้อสงสัย

1. **`auth.users` schema ที่แน่นอน** — ไม่ได้ประกาศใน repo (Supabase managed) รายละเอียดคอลัมน์ (`last_sign_in_at`, `confirmation_token`, `raw_app_meta_data`, `auth.audit_log_entries` ที่เก็บ IP + User-Agent) มาจากความรู้เรื่อง Supabase ไม่ใช่จากไฟล์ในเรพ → **ก่อนเขียนนโยบายควรเปิด Supabase Studio ดู `auth` schema จริงของโปรเจกต์ prod ยืนยันอีกรอบ**
2. **ไม่มีโค้ดเขียน `skill_tier`** — ตารางมีอยู่ (`0002:13-19`) และมีที่อ่าน (`create-room.ts:19-21`) แต่ grep แล้วไม่เจอ insert/update ที่ไหน → ตอนนี้อาจว่างเปล่าตลอด
3. **ไม่มีโค้ดเขียน `user_reputation`** — จ็อบ SQL อ่านอย่างเดียว (`0011:28-35`) ตั้งใจให้ตั้งค่าจากรีวิวมือ แต่ยังไม่มี tooling
4. **ไม่มี flow ลบบัญชี / export ข้อมูล / ถอนความยินยอม** — grep แล้วไม่พบโค้ดใดๆ ทั้งสิ้น ทั้งที่ ม.30-33 ให้สิทธิ์นั้น (schema ช่วยไว้ระดับหนึ่ง: ทุก FK เป็น `on delete cascade` ผูก `auth.users(id)` → ลบ user ใน Auth แล้วข้อมูลตามหายทั้งหมด **ยกเว้น** `processed_webhook_events` ซึ่งไม่มี user_id อยู่แล้ว)
5. **ระยะเวลาเก็บข้อมูล (retention)** — ไม่มีนโยบายลบอัตโนมัติในโค้ดเลย ทุกตารางเก็บถาวร ยกเว้น Redis key ที่มี TTL. Backup: `tcas-app/docs/runbook-backup-restore.md:103-104` ระบุ retention window ปัจจุบัน 7 วัน (PITR) และยังไม่ทำ off-site
6. **RLS ไม่ครบ** — เปิด RLS แค่ `questions`, `user_question_locks`, `user_attempts`, `user_ratings`, `tokens`, `subscriptions` (`0006`) + `consents` (`0014`). ตาราง `goals`, `reports`, `ratings`, `rooms`, `room_participants`, `skill_tier`, `user_reputation` **ไม่ได้เปิด RLS** — ปัจจุบันปลอดภัยเพราะ grant ให้แค่ `service_role` (`0004:21`, `0005:25`, `0002:22`, `0011:54`) และ server action วิ่งผ่าน SSR client ที่เป็น role `authenticated`… **ข้อนี้แปลว่า server action ที่ upsert `goals`/`ratings` ด้วย client ผู้ใช้ (`actions/mock.ts:8`, `actions/quality.ts:12`) น่าจะ permission denied — ยังไม่ได้ verify ด้วยการรันจริง ควรทดสอบ**
7. **`.env.example` เตือนว่าถ้าไม่ตั้ง Upstash → rate limit ปิดเงียบ** (`lib/rate-limit/store.ts:81-82`) แปลว่าถ้า prod ยังไม่ wiring IP จะไม่ถูกเก็บที่ Upstash เลย — inventory แถว "IP address" มีเงื่อนไขนี้
8. **หน้า `/privacy` ปัจจุบันเป็น placeholder ทั้งหมด** (`src/app/privacy/page.tsx:31-64`) — เอกสารนี้คือ input สำหรับเติมหัวข้อ 1 ("ข้อมูลที่เราเก็บรวบรวม") และเมื่อเผยแพร่ข้อความจริงต้องบั๊ม `PRIVACY_VERSION` เป็น `privacy_v2` ที่ `src/lib/consent/consent.ts:13` เพื่อบังคับ re-consent
