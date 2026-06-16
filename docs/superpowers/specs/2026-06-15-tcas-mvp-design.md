# TCAS AI Practice App — MVP Design (v1)

วันที่: 2026-06-15 · สถานะ: design (ผ่าน brainstorming + grill + scrutiny, รอ writing-plans)
ผู้ตัดสินใจ: พี่ Zen (solo founder) · ผู้ช่วย: คาโฮะ

> ผลตกผลึกจาก brainstorming + grill + scrutiny session — รวบทุก decision ที่ lock แล้ว
> อ้างอิงบริบทเต็ม: `CLAUDE.md`, `tcas-app-product-doc.md`, `TCAS Financial Model.xlsx`
> ⚠️ เอกสารนี้ **supersedes** CLAUDE.md §4 บางจุด (transfer rate, confidence bands) — ต้อง sync CLAUDE.md ให้ตรง

---

## 1. กลยุทธ์ Build (แกนสุด)

**ทำแอปจริงเลย ไม่แวะ validate ก่อน — แบบ capital-light + บีบ burn ให้เล็กสุด**

- bank เริ่มเล็ก งบ ~10,000฿ → demand-driven generation (bank โตตาม user จริง)
- **เอา revenue ของ user มาหมุน** fund การ gen รอบถัดไป

> ⚠️ **Reality check (จาก scrutiny):** "capital-light" ลดเฉพาะ **bank-gen cost** (ก้อนที่ deferrable สุด) — **ไม่ได้ลด runway จริง** ที่ financial model ชี้ว่าคือ **operating drawdown ~180,000฿** (CAC + infra + เดือนที่ยังไม่มีรายได้). bank 10k ≠ project เสี่ยงแค่ 10k
>
> **กลยุทธ์: build แต่บีบ burn** เพื่อกด drawdown ให้ต่ำกว่า 180k:
> - **No paid marketing ช่วงแรก** — โต organic (short-form content + social viral loop) ลด CAC
> - **Trial สั้น** (ดู §3.1) — ดันให้เริ่มเก็บเงินเร็ว
> - **Seed bank ~4k gen ผ่าน Claude Code (flat subscription) = cost ≈ 0** → pre-launch ก้อนแรก (~8k฿ ถ้าใช้ API) เกือบหายไป (gen ก้อนแพงฟรี; จ่าย API เฉพาะ verify scale phase) — ดู §4.3
> - **เดือน 1-2 = external funding ไม่ใช่ revenue-funded** (paying user = 0 ช่วงนั้น) → "เงิน user หมุน" เริ่มจริง ~เดือน 3
> - 📌 **Runway (financial model updated 2026-06-15):** หลัง seed ผ่าน Claude Code (gen ≈ 0) → max drawdown ยุบเหลือ **Base ~18k / Conservative ~79k (worst) / Optimistic ~1k** (เดิม ~180k) → เตรียม **~80k worst case ก็พอ** · ⚠️ Conservative ยังไม่คืนทุนปี 1 (conv 12%) → **conversion ยังเป็นความเสี่ยงหลัก** (ไม่ใช่เงินทุนแล้ว)

---

## 2. MVP v1 Scope

| Feature | v1? | หมายเหตุ |
|---|---|---|
| Auth | ✅ v1 | Supabase Auth |
| Practice Mode (solo) + adaptive | ✅ v1 | |
| Token system (practice + social) | ✅ v1 | |
| Content pipeline + confidence/report | ✅ v1 | backbone |
| **Social Mode — private room** | ✅ v1 | viral loop (ชวนเพื่อน + shareable card) |
| Payment + Reverse trial | ✅ v1 | web checkout เลี่ยง store fee |
| **Mock Exam** | ⏳ **v1.1 (fast-follow)** | เปิด v1 เสถียรปุ๊บ ลุยต่อทันที |
| **Goal setting** | ⏳ **v1.1 (fast-follow)** | คู่กับ mock |
| Public matchmaking / 1v1 duel | 🔮 future | cold-start trap (ไม่มี liquidity ช่วงแรก) |

- **วิชา v1: คณิต + Physics** (Physics conversion token→โจทย์ ต่างจากคณิต)
- ⚠️ schema/architecture ต้องเผื่อ mock + goal ตั้งแต่ v1 → implement v1.1 ต่อได้ไม่ rework
- ⚠️ **bank เล็ก + 2 วิชา = pool บาง** (ดู §4 + W1 mitigations: lock 30 วัน + escape hatch)

---

## 3. Monetization

### 3.1 Free Model: Reverse Trial (ตัด "ฟรี 2 เดือนแรก" ทิ้ง)

```
Trial สั้น (X วัน — TBD, สั้น)   Free ถาวร                      Paid
ของเต็ม* แต่มี ceiling      →   practice เท่านั้น (recycled),  →  T1 99฿ / T2 249฿
mock(v1.1), social, เห็น rank    ซ่อน rank, ไม่มี mock/social
```

- **ไม่มี launch promo "ฟรี 2 เดือน"** — reverse trial ให้ taste เต็มอยู่แล้ว + เริ่มเก็บเงินเร็ว (boost cold start ด้วย "trial ยาวพิเศษให้ early adopter" แทนฟรียกแผง)
- ⚠️ **Trial cost guardrail (จาก scrutiny C2/W2):** ช่วง launch ~100% ของ user เป็น trial (ยังไม่มีใคร convert) = consumption หนักสุดตอน revenue = 0 → **trial ต้องมี per-day refill-demand ceiling** (taste ฟีเจอร์เต็ม แต่ไม่ unlimited consumption) — guardrail "free=recycled" ไม่พอ เพราะตัวแพงจริงช่วง launch คือ trial cohort ไม่ใช่ free
- **ไม่ผูกบัตรตอน trial** → trial หมด downgrade เป็น free อัตโนมัติ → user active upgrade เอง
- Payment: **PromptPay / TrueMoney / mobile banking** (Omise)
- 🩸 **กฎเหล็ก:** free กินแต่ recycled pool — ห้าม trigger gen สด

### 3.2 Feature Gating

| Feature | Free | Trial | Paid |
|---|---|---|---|
| Practice | ✅ (quota เล็ก, recycled) | ✅ (เต็ม + ceiling) | ✅ |
| เห็น rank | ❌ ซ่อน (**track เบื้องหลังต่อ** — adaptive ทำงาน + upgrade hook) | ✅ | ✅ |
| Mock (v1.1) | ❌ | ✅ | ✅ |
| Social | ❌ | ✅ | ✅ |
| Social token | ❌ | ✅ | ✅ |

### 3.3 Pricing & Token

| | ราคา | Practice | Social | + |
|---|---|---|---|---|
| **Tier1** | 99฿ | 1 token/วัน | 1 token/วัน | analytics พื้นฐาน |
| **Tier2** | 249฿ | 3 token/วัน | 2 token/วัน | analytics ลึก + priority |

- **หน่วย "token/วัน"** — 1 token ได้โจทย์ไม่เท่ากันรายวิชา (คณิต 1 token = 10 ข้อ; Physics — TBD) เพราะต้นทุน gen ต่าง
- **token สะสมได้แบบมีเพดาน — cap = 7 วัน worth** → roll-over + binge ช่วงสอบได้พอควร แต่ cap กัน cost spike (ให้ batch refill คำนวณ buffer ได้)
- **โอน social → practice = 1 : 0.5** · practice → social **ไม่ได้** (ทางเดียว) — ⚠️ *supersedes CLAUDE.md (เดิม 1:1)*
- **ไม่มี win-streak bonus** (ตัดออก — เดิม product doc มี "ชนะ 3 รอบ +1 social token" แต่ v1 มีแต่ private room ที่ปั่น streak ได้ง่าย → ตัดทิ้งเลย = ดับปัญหา farm loop (W7) ทั้งหมด ไม่ต้องทำ anti-farm) — *supersedes product doc + CLAUDE.md*

> **Verdict (grill):** ราคา make sense ทั้ง 2 ด้าน (user ยอมจ่าย ถูกกว่า Clearnote/OnDemand + founder กำไรบางที่ T1 แต่บวก) — ความเสี่ยงจริง = **conversion** + **recycle efficiency** ไม่ใช่ price point

---

## 4. Content & Quality Pipeline

> **bank เริ่มจริง ~4,000-4,300 โจทย์** (งบ 10k ÷ ~2฿/ข้อ realistic หลัง reject ~15% ตาม product doc) — *ไม่ใช่ 8-10k (แก้จาก scrutiny N1)* → กระจาย 2 วิชา × 75 sub-pool = ~27 ข้อ/sub-pool (บาง → ดู mitigations)

### 4.1 Generation — 3 trigger
1. **Capacity** — user เพิ่มจน pool ไม่พอ steady-state → gen ขยาย
2. **Variety** — rate ราย sub-pool
3. **Structure change** — TCAS เปลี่ยน → แก้ pool (`curriculum_version` tag เพื่อ deprecate เป็นชุด)

### 4.2 Generation — กลไก: Background Batch Refill + Bounded Escape Hatch

- monitor: **min available-per-user ใน sub-pool** (คนที่เหลือ "โจทย์ยังไม่เจอใน lock window" น้อยสุด เหลือกี่ข้อ)
- ต่ำกว่า **safety buffer** (เผื่อ lead time batch ~24h + พีค) → enqueue **batch gen เติมล่วงหน้า** (Batch API ลด ~50%)
- ⚠️ **Bounded escape hatch (จาก scrutiny C3):** เดิมตั้งใจ "ไม่มี real-time fallback" แต่ขัดกับ viral loop (shareable card = influx แบบ non-smooth → buffer หมดก่อน batch 24h กลับมา → pool ว่าง → first impression พังกับ traffic ดีสุด)
  - → **real-time gen สด เฉพาะตอน pool จะว่างจริงสำหรับ user คนนั้น** (fire นานๆ ที = cost จำกัด) — เป็น escape hatch ไม่ใช่ default path
  - cost cap: จำกัดจำนวน real-time gen ต่อวัน/ต่อ sub-pool กัน abuse + cost ระเบิด

### 4.3 Pipeline & Generation Phasing

โครง: **Claude gen → solve อิสระ (blind — ไม่เห็นเฉลย, ขอแค่คำตอบ) → ตรงกัน = pass (DB 70+) / mismatch = regen**

**3-phase (ลด cost ช่วงแรกด้วย Claude Code flat-rate — "do things that don't scale"):**

| Phase | เมื่อ | Gen | Verify |
|---|---|---|---|
| **Seed** | ก่อนเปิด, bank ~4k | Claude Code (flat ≈ 0) | **พี่ตรวจมือล้วน** (human — ดีสุดสำหรับ seed) |
| **Transition** | ใกล้/ช่วงเปิดจริง | Claude Code | **kaho spawn agent blind-solve** (แค่คำตอบ) ด้วย **Claude คนละรุ่นจาก gen** + พี่ spot-check sampling |
| **Scale** | refill ~10k/เดือน | API Batch | API cross-model |

- ⚠️ **Transition independence ไม่เต็ม:** Claude same-family คนละรุ่น = ลด correlated error บางส่วน (ดีกว่ารุ่นเดียวกัน แต่ไม่เท่า cross-vendor) → **พี่ spot-check หนักขึ้นช่วงนี้ชดเชย** + พิจารณาขยับเป็น cross-vendor (GPT-4o) ตอน scale ถ้าจำเป็น
- 📌 **Model pairing (รุ่นไหน gen / รุ่นไหน verify) = TBD — พี่จะทดสอบเอง**
- ตอน implement: อ่าน `claude-api` skill ก่อน lock model/pricing (N3)

### 4.4 Quality Signals
- **Rating** (ดี/เฉยๆ/แย่) สุ่มถามนานๆที → feed confidence
- **Report** กดได้ทุกข้อ — ❌ ไม่มี report bonus + **anti-spam:** บังคับ category + rate-limit + reputation weight + ต้องหลายคน

### 4.5 Confidence Floor & Mode Gating
> ⚠️ *supersedes CLAUDE.md confidence 4-band (50-69 pending / <50 auto-suspend) — เปลี่ยนเป็น floor เดียว ต้อง sync CLAUDE.md*

**ฟลอร์เดียว:** โจทย์เกิดที่ 70+ → ตกถึงฟลอร์ = auto-remove → ทุกตัวที่อยู่ = practice/social ใช้ได้

| Mode | ใช้โจทย์ไหน |
|---|---|
| Practice / Social | ทุกตัวในระบบ (เหนือฟลอร์) — ไม่กรอง |
| **Mock** | **90+ เท่านั้น** ← active gate เดียว |

### 4.6 Report Handling — Tiered by Stakes
- **Practice/Social:** confidence ตก → **auto-remove + gen ใหม่** (ไม่ตรวจ)
- **Mock/90+:** เข้า queue → **พี่ตรวจมือ**
- ❌ ไม่ใช้ AI ตรวจ report

### 4.7 Promote 70 → 90+ (ประตู mock)
- **เงื่อนไข AND:** usage ≥ N · report rate ต่ำ · rating ดี · **discrimination ดี** · **RD ต่ำ**
- **Phased gate:** cold start = auto→candidate→พี่ sampling | พิสูจน์แม่นแล้ว → auto ล้วน
- ✅ ไม่ลด threshold 90+

---

## 5. Calibration System (Glicko-2 style)

### 5.1 Difficulty Model — แยก 2 field
```
difficulty_level (1-5)      → stable bucket: sub-pool, UX, recycle/gen อิงตัวนี้
difficulty_value (float)    → dynamic: calibrate จาก performance
```
- Cold start: seed `difficulty_value` จาก generated level → refine ด้วย usage
- Auto re-bucket: value drift หลุด boundary → ย้าย sub-pool (event)

### 5.2 Rating Architecture — 2 Layer + Cold-Start Anchor

| Layer | คือ | เคลื่อนที่ |
|---|---|---|
| **True rank (persistent)** | ความสามารถจริง (Glicko, per topic per subject) | ช้า — กัน session noise; streak เบา |
| **Serving difficulty (session)** | เลือกโจทย์ข้อต่อไป — ถูกรัวๆ → ยากขึ้น | เร็ว — **ไม่เขียนกลับ rank แรง** |

- **Streak/momentum ยังมี** — ถูก/ผิดรัวๆ → ขยับ rank/difficulty เร็วขึ้น (serving มาก, true rank เบา) ⚠️ *คนละอันกับ win-streak **bonus token** ที่ตัดทิ้ง §3.3 — อันนี้คือ rating multiplier ไม่ใช่ token*
- **Two-way update:** ทุก attempt = แมตช์ user-rating ↔ question difficulty_value → อัปเดตทั้งคู่
- difficulty_value อิง **true rank (นิ่ง) + ถ่วง RD** · กัน fluke ด้วยสะสมหลายแมตช์
- ⚠️ **Cold-start anchor (จาก scrutiny C4):** วันแรกทั้ง user+question uncertain คู่กัน → two-way จากแมตช์ #1 = ไม่ converge / biased
  - → **freeze (หรือ damp หนัก) difficulty_value จนโจทย์มี ≥N attempts จาก user ที่ RD ต่ำแล้ว** → ระหว่างนั้นใช้ generated level เป็น prior anchor + อัปเดตเฉพาะ user rank → ครบหลักฐานค่อย unfreeze question calibration
  - = reuse evidence bar เดียวกับ promote 70→90 (§4.7)
- ⚠️ **Social repeat-exposure (จาก scrutiny W5):** social ignore lock → user เจอโจทย์เคยทำได้ → **exclude/down-weight social attempt บนโจทย์ที่ user มี lock/attempt recent ออกจาก calibration** (decouple "serve" ออกจาก "trust for rating")
- **mock = ตัวขยับ true rank หลัก** (วัดสะอาดสุด)
  - ⚠️ **(จาก scrutiny W6):** mock = v1.1 → v1 ทั้งช่วง rank ขับด้วย practice/social (noisy) → **define rank behavior ใน v1 mock-less + คาด rank recalibration ตอน mock มา** (สื่อสาร user ล่วงหน้า)
- user ใหม่: เริ่มกลาง + RD สูง (placement ในตัว) ไม่ต้อง quiz
- 📌 สมการ (K/RD/streak/mock weight) → **Glicko-2 โครง, tune ตอน implement**

---

## 6. Modes

### 6.1 Practice (solo)
- Adaptive รายคน (serving layer): ถูก→ขึ้น ผิด→ลง · ดึงทุกตัวในระบบ · เลือก topic · แสดง Skill Tier 1-5

### 6.2 Social (v1 = private room)
- = practice หลายคน · ทุกคนเล่น **โจทย์ชุดเดียวกัน** (amortize cost)
- **สุ่มชุด 100% จาก range สกิลห้อง** · **ไม่ดู lock** (เกม speed) · **ไม่ gen สด**
- **Private room (code)** เป็นหลัก — range กว้างได้ ไม่ cap
- Settings: วิชา/จำนวนข้อ/timer/mode (wait-all + first-come-next) · จบ: leaderboard + เวลาเฉลี่ย + ข้อผิดมากสุด + **shareable card (viral core)**
- ⚠️ social attempts บนโจทย์ที่เคยเจอ → ไม่ feed calibration full weight (ดู §5.2 W5)

### 6.3 Mock (v1.1)
- 90+ เท่านั้น · ชุด fixed · คะแนน + โอกาสติด + จุดอ่อนเทียบคณะ

---

## 7. Data Model Sketch (เผื่อ v1.1)

- `questions`: id, subject, topic, **difficulty_level (1-5)**, **difficulty_value (float)**, **rating_deviation (RD)**, **difficulty_frozen (bool — cold-start anchor)**, confidence_score, **mock_eligible**, curriculum_version, status
- `user_question_locks`: user_id, question_id, **lock_until** — **30-day ช่วง bank เล็ก** (จาก scrutiny W1; เดิม 90 tuned for 100k bank) · *practice เท่านั้น; social ไม่สน*
- `user_attempts`: user_id, question_id, correct, time_spent, context (practice/social/mock), **count_in_calibration (bool)**
- `user_ratings`: user_id, subject, topic, **true_rank**, **rd** (Glicko state)
- `tokens`: user_id, practice_balance, social_balance (สะสมได้, **cap 7 วัน worth**)
- `skill_tier`: user_id, subject, topic, tier (1-5, derived จาก true_rank)
- `rooms` + `room_participants`: social (settings, state machine, ชุดโจทย์ที่สุ่มไว้)
- `reports`: question_id, user_id, category, weight · `ratings`: question_id, user_id, score
- `goals`: user_id, target_faculty *(v1.1 slot)*
- `subscriptions`: user_id, tier, trial_ends_at, **status (trial / trial_expired_free / free / paid)** — มี state "เคย trial → free" เพื่อ track rank-hidden (N5)

---

## 8. Tech Stack

| Layer | เลือก | เหตุผล |
|---|---|---|
| DB + Realtime + Auth | **Supabase** (Postgres) | all-in-one, WebSocket, solo-friendly |
| AI Generation | **Claude Sonnet (ล่าสุด)** | cost ต่ำ — Batch API ลด 50% *(อ่าน claude-api skill ก่อน lock)* |
| AI Verification | **GPT-4o** (confirm ตอน implement) | cross-model independence |
| Backend | Supabase Edge Functions / Railway | simple |
| Frontend | **web-first** | เลี่ยง store cut |
| Payment | **Omise** (PromptPay/TrueMoney/card) | เลี่ยง store fee + ช่องทางเด็กไทย |

---

## 9. Open TBDs (เคาะตอน implement)
- **Trial duration (สั้น — เป็น cash-flow lever ไม่ใช่แค่ UX, N2)** + early-adopter trial ยาว
- Trial per-day consumption ceiling (C2)
- Physics: 1 token = กี่โจทย์
- Safety buffer + escape-hatch trigger/cap (C3)
- Free tier quota · Confidence floor · promote threshold N · cold-start freeze N (C4)
- Variety rate · Glicko-2 constants · re-bucket boundary
- **Model pairing gen/verify (phase transition) — พี่ทดสอบเองว่าคู่ไหนดี**
- lock 30 วัน — review เมื่อ bank โต (กลับ 90 เมื่อ pool หนา)

---

## 10. Future Ideas
- Public matchmaking (เมื่อมี liquidity) · 1v1 duel (game layer) · tier เพิ่ม (B2B/โรงเรียน)

---

## 11. Build Order

> 🔄 **Seed bank (~4k โจทย์ — gen ผ่าน Claude Code + พี่ verify มือ) = PARALLEL TRACK**
> ค่อยๆ ทำขนานไปกับทุก step ด้านล่าง **ไม่ใช่ขั้นที่ต้องเสร็จก่อนถึงจะ build แอป** — พอแอปพร้อม bank ก็สะสมพอ launch พอดี
> เงื่อนไขเดียว: schema (questions + difficulty + confidence) ต้องเสร็จก่อนเริ่ม import seed (= step 1)

**Build track (sequential):**
1. **Schema foundation** — difficulty model (level + value + RD) + confidence/report + questions/locks/attempts tables + escape-hatch hook → *เปิดทางให้ import seed bank ขนานได้*
2. Calibration engine (Glicko-2 2-layer + cold-start anchor) + Auth + Practice Mode + adaptive + token (cap 7 วัน)
3. Reverse trial (+ consumption ceiling) + payment (Omise web)
4. Social Mode (private room) + shareable card + win-streak anti-farm
5. **(v1.1)** Mock (90+ seed human-verify) + goal + rank recalibration
6. ขยายวิชา (Chem → Bio); lock review กลับ 90 เมื่อ pool หนา

---

## 12. Revision Log
- **2026-06-15 post-scrutiny:** แก้ตาม 9arm scrutinize — runway reality §1 (C1/C2), trial ceiling §3.1 (W2), bounded escape hatch §4.2 (C3), cold-start anchor + social-calibration decouple §5.2 (C4/W5), rank-in-v1 note (W6), **ตัด win-streak ทิ้งทั้งหมด** §3.3 (W7 หมดความจำเป็น), lock 30 วัน §7 (W1), bank ~4k §4 (N1), subscription state (N5). Root cause: premise 100k→10k เปลี่ยน decision ลูกตามมาแก้
- **2026-06-15 sync CLAUDE.md เสร็จ:** confidence floor · token (social Tier1=1/Tier2=2, เฉพาะ trial+paid, transfer 1:0.5, cap 7 วัน) · lock 90→30 · adaptive→Glicko-2 2-layer · pricing reverse-trial (ตัด free 2 เดือน) · content pipeline 3-phase · data model + build-phase superseded flag + pointer → design doc
