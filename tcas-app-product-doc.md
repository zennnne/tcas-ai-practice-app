# TCAS AI Practice App — Product Document

> สรุปรายละเอียดทั้งหมดจาก product session

---

> ## 📝 Revision Note (ตัวเลขฉบับปรับสมจริง)
> เอกสารนี้ถูกปรับตัวเลขการเงินให้สมจริงขึ้น (ของเดิมมองโลกในแง่ดีเกินไป) จุดที่แก้:
> 1. **Conversion 50% → 12/20/35%** (Base 20%) — freemium จริงไม่ถึง 50%
> 2. **เพิ่ม CAC + ค่าธรรมเนียม store/payment** ที่เดิมไม่ได้คิด → margin จริง ~14-77% ไม่ใช่ 98%
> 3. **Pre-launch cost 32k → ~160k** — ต้นทุนสร้าง question bank ต่ำไป ~6-9 เท่า
> 4. **Year-1 net +1.17M → Base +50k** (คืนทุน ก.ค. ไม่ใช่ 2 สัปดาห์) — ปีแรกแบก pre-launch, กำไรจริงพุ่งปีที่ 2
> 5. **Reconcile Roadmap revenue** ที่เดิมขัดกับ cash flow 3-4 เท่า
>
> 📊 โมเดลคำนวณเต็ม + ปรับ scenario ได้: **`TCAS Financial Model.xlsx`** (3 scenario: Conservative/Base/Optimistic)

---

## Overview

Subscription-based app ที่ใช้ AI ในการผลิตโจทย์สำหรับเด็กเตรียมสอบ TCAS โดยเริ่มจากวิชา Math ก่อน แล้วขยายไป Physics, Chemistry, Biology

**Target Market:** เด็ก TCAS ในไทย (~300,000 คน/ปี, addressable ~30,000 คน)  
**Model:** Subscription + Token-based usage  
**Solo founder:** ใช่ — ทำคนเดียวในช่วงแรก

---

## Features

### 1. Mock Exam (รายเดือน)
- สอบครบทุกวิชา เดือนละ 1 ครั้ง
- คำนวณคะแนนและบอกโอกาสติดเทียบกับสถิติปีก่อน
- บอกจุดอ่อนแต่ละวิชาเทียบกับคณะเป้าหมายที่ตั้งไว้
- ใช้เฉพาะโจทย์ที่มี confidence score 90+ เท่านั้น (high-stakes)

### 2. Practice Mode (Solo — Daily Token)
- Tier 1: 1 token/วัน → 10 โจทย์/token
- Tier 2: 3 token/วัน → 10 โจทย์/token
- เลือก topic ที่อยากฝึกได้เอง
- Adaptive difficulty: ทำถูก → ยากขึ้น, ทำผิด → ง่ายลง
- แสดง Skill Tier 1–5 per topic per subject

### 3. Social Practice Mode (ใหม่)
ระบบสร้างห้องเล่นกับเพื่อน คล้าย Wordle-style เล่นเช้าก่อนเรียน

**Token System (แยกจาก Solo Practice):**
- Social token: วันละ 1 token (ทุก tier)
- เข้าห้อง 1 ครั้ง = 1 social token
- Social token ที่เหลือ → โอนเป็น practice token ได้
- Practice token → ใช้เล่น social ไม่ได้

**Room Settings:**

| Setting | ตัวเลือก |
|---------|---------|
| วิชา / Topic | เลือกเองหรือ random |
| จำนวนข้อ | 5 / 10 / 15 |
| Mode | Wait for all / First come next |
| Timer per ข้อ | ไม่มี / 30s / 60s / 90s |
| Difficulty | เลือกเองหรือ adaptive ตาม avg skill ของห้อง |
| Room type | Public / Private (room code) |

**หลังจบรอบ:**
- Leaderboard ของห้อง
- เวลาเฉลี่ยต่อข้อของแต่ละคน
- ข้อที่ทั้งห้องทำผิดมากที่สุด
- Shareable result card (Wordle-style) → viral loop

**Win streak bonus:** ชนะ 3 รอบติด = +1 social token

### 4. Goal Setting
- ตั้งคณะเป้าหมายใน app
- ระบบใช้ข้อมูลนี้ในการคำนวณโอกาสติดและ highlight จุดอ่อน

---

## Backend Systems

### Question Bank
- เริ่มต้น: 100,000 โจทย์ (ก่อน launch)
- เติมรายเดือน: ~10,000 โจทย์/เดือน (dynamic ตาม sub-pool depletion)
- Structure: 15 topics × 5 difficulty levels = 75 sub-pools/วิชา
- 90-Day Recycle Rule: โจทย์ที่ user ทำแล้ว lock 90 วัน แล้ว unlock กลับเข้า pool

### Adaptive Difficulty System
- ใช้ user performance data แบบ weighted
- คนที่เก่งเรื่องไหน → มีน้ำหนักมากกว่าในการ calibrate difficulty ของ sub-pool นั้น
- ช่วยให้ difficulty calibration แม่นขึ้นเรื่อยๆ ตาม network effect (data flywheel)

### Confidence Scoring System

| Score | ความหมาย | การใช้งาน |
|-------|---------|---------|
| 90–100 | ผ่าน cross-verify + ไม่มี report | ใช้ได้ทุก mode รวม mock test |
| 70–89 | ผ่าน auto-verify แต่ยัง user-verify ไม่ครบ | ใช้ได้ใน practice เท่านั้น |
| 50–69 | มี user report 1–2 ครั้ง | Pending review |
| < 50 | มี user report 3+ ครั้ง | Auto-suspend |

### Content Quality Pipeline (Cross-Model Verification)

```
Step 1: Claude Sonnet 4 generates question
         ↓
Step 2: GPT-4o solves independently (ไม่รู้คำตอบจาก Step 1)
         ↓
Step 3: ถ้าคำตอบตรงกัน → pass (confidence 70+)
         ถ้า mismatch → flag → regenerate
         ↓
Step 4: Enter DB → รอ user interaction data
         ↓
Step 5: Score adjust จาก usage → promote to mock-eligible (90+)
```

**Assumed reject rate:** ~15% → ต้อง generate 118,000 เพื่อได้ 100,000 โจทย์ที่ใช้ได้

### User Report System
- ปุ่ม "รายงานโจทย์ผิด" ใน app (กด 1 ครั้ง + categorize)
- Incentive: รายงานโจทย์ผิดได้รับ bonus practice token
- โจทย์ที่ถูก report 3 คนขึ้นไป → auto-suspend รอ review

### Real-time (Social Mode)
- ใช้ WebSocket สำหรับ sync ระหว่างผู้เล่นในห้อง
- Supabase Realtime รองรับได้ในราคาเดิม ไม่ต้องเปลี่ยน stack

---

## Pricing

| Tier | ราคา/เดือน | Practice Token | Social Token |
|------|-----------|---------------|-------------|
| Free (2 เดือนแรก) | ฟรี | จำกัด | จำกัด |
| Tier 1 | 99 บาท | 1/วัน | 1/วัน |
| Tier 2 | 249 บาท | 3/วัน | 1/วัน |

**ARPU เฉลี่ย (80/20 split):** 99×0.8 + 249×0.2 = **~129 บาท/คน/เดือน** (gross)

> ⚠️ **ARPU สุทธิต่ำกว่านี้** หลังหักค่าธรรมเนียมที่เดิมไม่ได้คิด:
> - **App Store / Play Store: หัก 15-30%** (ถ้าขายผ่าน mobile app) ← ก้อนใหญ่สุด
> - **Payment gateway ไทย: ~3%**
> → **กลยุทธ์สำคัญ:** ถ้าทำได้ ให้ subscribe/จ่ายเงินผ่าน **web** (Stripe/Omise) เพื่อเลี่ยง store cut
> → Net ARPU จริง: ~125 บาท (web, fee 3%) ถึง ~105 บาท (store, fee ~18% เฉลี่ย)

**เทียบตลาด:**
- OnDemand: ~590 บาท/เดือน
- Clearnote Premium: ~129 บาท/เดือน
- แอปนี้: ถูกกว่าทุกเจ้า แต่ยัง perceived value ดีกว่า 80/200

---

## Cost Analysis

### Pre-Launch Cost (100,000 โจทย์ + Cross-Model Verification)

> ⚠️ **ตัวเลขเดิมต่ำเกินจริง ~6-9 เท่า** — ประเมินต้นทุน generate+verify ไว้ ~0.26 บาท/โจทย์
> แต่โจทย์เลขพร้อมเฉลยใช้ ~1,500-2,500 output tokens + verification solve อีกรอบ → realistic ~1.5-2 บาท/โจทย์
> (รวม regenerate จาก reject) ดู scenario ทั้งหมดใน `TCAS Financial Model.xlsx`

```
                                  เดิม(ต่ำไป)    Base(จริง)
Claude Sonnet 4 (Generation):     ~12,100      ~90,000
GPT-4o (Verification):            ~13,800      ~60,000
DB Setup (Supabase Pro 3 เดือน):   ~2,700       ~2,700
Domain + Hosting Setup:            ~1,500       ~1,500
Misc:                              ~2,000       ~5,800

รวม Pre-Launch:                   ~32,100     ~160,000
```

**ตัวช่วยลดต้นทุน:** (1) ใช้ **Batch API** (Anthropic + OpenAI ลด ~50%) เพราะ pre-gen ไม่ต้อง real-time
→ ลงได้ถึง ~100,000 บาท  (2) **launch ด้วย bank เล็กลง** (เช่น 30,000 โจทย์) แล้วทยอยเติม → ลด capital ก้อนแรกได้มาก

### Monthly Running Cost (Post-Launch)

```
AI Generation + Verification (10,000 โจทย์): ~2,480 บาท
DB Hosting (Supabase Pro):                    ~900 บาท
AI Inference (adaptive logic):                ~800 บาท
Hosting + CDN + Auth:                         ~600 บาท

รวม infra/เดือน:                            ~4,780 บาท
```

> ⚠️ **ขาดต้นทุนหา user (CAC)** — เดิมไม่คิดเลย แต่สำหรับ consumer app นี่มักเป็นก้อนใหญ่สุด
> ในโมเดลใหม่คิด CAC = **8-40 บาท/user ใหม่** (Base 20) → ช่วง ramp/peak ค่าใช้จ่ายรวมขึ้นเป็น **~9,000-16,000 บาท/เดือน**
> ยังไม่รวม: payment gateway fee (~3%), เงินเดือน founder, support, ภาษี

---

## Cash Flow Projection (Launch: กันยายน, ราคา 99/249)

> ⚠️ **เวอร์ชันเดิมมองโลกในแง่ดีเกินไป** — สมมติ **conversion 50%** (จริง freemium edtech ~2-10%, สูงสุด ~15-25%),
> **ไม่มี CAC/marketing cost** และ **ไม่มีค่าธรรมเนียม store/payment** เลย → ทำให้ตัวเลขพอง ~3-5 เท่า
> เวอร์ชันด้านล่างใช้สมมติฐานสมจริง ปรับ scenario ได้ใน **`TCAS Financial Model.xlsx`**

### Base Case (conversion 20%, มี CAC + ค่าธรรมเนียม, pre-launch 160k)

| เดือน | Stage | Total Users | Paying | Net Revenue | Cost | Net | Cumulative |
|-------|-------|-------------|--------|-------------|------|-----|------------|
| ก.ย. | Launch + Free | 206 | 0 | 0 | 9,320 | -9,320 | -169,320 |
| ต.ค. | Free + Ramp | 552 | 0 | 0 | 12,120 | -12,120 | -181,440 |
| พ.ย. | Convert | 966 | 193 | 22,905 | 13,480 | +9,425 | -172,014 |
| ธ.ค. | Ramp | 1,448 | 290 | 34,417 | 14,840 | +19,577 | -152,437 |
| ม.ค. | Peak | 2,000 | 400 | 47,472 | 16,240 | +31,232 | -121,205 |
| ก.พ. | Post-exam drop | 1,656 | 331 | 39,283 | 5,200 | +34,083 | -87,122 |
| มี.ค. | Churn | 1,172 | 234 | 27,771 | 5,200 | +22,571 | -64,551 |
| เม.ย. | Low season | 966 | 193 | 22,905 | 5,200 | +17,705 | -46,846 |
| พ.ค. | ม.5 เริ่มสนใจ | 1,104 | 221 | 26,228 | 7,960 | +18,268 | -28,577 |
| มิ.ย. | Slow build | 1,276 | 255 | 30,263 | 8,640 | +21,623 | -6,954 |
| ก.ค. | **Break-even** | 1,482 | 296 | 35,129 | 9,320 | +25,809 | **+18,854** |
| ส.ค. | Pre-season | 1,758 | 352 | 41,775 | 10,720 | +31,055 | +49,910 |

**Year 1 Net (Base, หลัง pre-launch 160k): ~+49,910 บาท**  
**คืนทุน: ~เดือน ก.ค. (เดือนที่ 11)** — ไม่ใช่ 2 สัปดาห์ เพราะต้องถม pre-launch cost ก้อนใหญ่ก่อน

> 💡 **อ่านโมเดลให้ถูก:** ปีแรก "เกือบเท่าทุน" เพราะแบกต้นทุน pre-launch (สร้าง bank) ที่จ่ายครั้งเดียว
> **เศรษฐศาสตร์ที่แท้จริงแข็งแรง** — ปีที่ 2 ไม่มีก้อนนี้ + ฐาน user เดิม → กำไรพุ่ง (ดู Optimistic / ปีที่ 2)

### สรุป 3 Scenario (Year 1) — จาก `TCAS Financial Model.xlsx`

| Metric | Conservative | **Base (แนะนำ)** | Optimistic |
|--------|-------------|-------------|-----------|
| Conversion rate | 12% | **20%** | 35% |
| Peak users (ม.ค.) | 1,200 | **2,000** | 3,000 |
| Pre-launch capital | 260,000 | **160,000** | 100,000 |
| Max cash drawdown (เงินต้องมีจริง) | -304,000 | **-181,000** | -116,000 |
| Year-1 Net Profit | **-294,000** ❌ | **+50,000** | **+717,000** |
| Net Margin | ติดลบ | **~14%** | ~77% |
| Break-even | ไม่ทันปี 1 | **ก.ค. (เดือน 11)** | ธ.ค. (เดือน 4) |

**ประเด็นสำคัญ:**
- **ความเสี่ยงขาดทุน "ก้อนใหญ่" ต่ำ** เพราะต้นทุน fixed ต่ำมาก แต่เงินที่ต้องเตรียมจริงคือ **~180,000 บาท** (Base) ไม่ใช่ 32,100
- **Conservative ขาดทุนปี 1** = สัญญาณให้ validate conversion จริงก่อน (pre-order/waitlist) ก่อนทุ่มสร้าง bank เต็ม
- ตัวเลขนี้ **ยังไม่รวมเงินเดือน/ค่าเสียโอกาส** ของ solo founder

---

## Growth & Scale Roadmap

### Phase 1 — Dominate TCAS Science (ปีที่ 1–2)
- Math → Physics → Chem → Bio
- เป้า: 5,000–8,000 users
- Focus: content quality + short form content marketing

> ⚠️ **ตัวเลข revenue เดิมขัดกับ Cash Flow เอง 3-4 เท่า** — Roadmap เขียน "650k-1M/เดือน" แต่ Cash Flow
> ปีแรก peak net revenue จริง ~47k/เดือน (Base) ดู reconcile ด้านล่าง:
> - **ปีที่ 1 (peak season):** ~30,000-130,000 บาท/เดือน (Base→Optimistic) — *ไม่ใช่* 650k
> - **5,000-8,000 users จะถึงในปีที่ 2** ไม่ใช่ปีที่ 1: ถ้าได้ 6,000 users × 20% × 125 = **~150,000 บาท/เดือน**
> - ตัวเลข 650k+/เดือน เป็นภาพ **ปีที่ 2-3** (ฐาน user ใหญ่ + หลายวิชา) มากกว่า

### Phase 2 — ขยาย TCAS สายศิลป์-คำนวณ (ปีที่ 2–3)
- TPAT1, A-Level Thai, Social, English
- TAM เพิ่มจาก 30,000 → 80,000+ คน
- ความท้าทาย: วิชาภาษา/สังคม AI generate ยากกว่า Math มาก

### Phase 3 — Certification อื่น (ปีที่ 3–4)
| ตลาด | ขนาด | ความยาก |
|------|------|---------|
| สอบ ก.พ. | ~200,000 คน/ปี | ปานกลาง (แนะนำสุด) |
| สอบครูผู้ช่วย | ~100,000 คน/ปี | ปานกลาง |
| USMLE / เตรียมแพทย์ | เล็กแต่จ่ายสูง | ยากมาก |
| IELTS / TOEIC | ใหญ่มาก แต่คู่แข่งเยอะ | สูง |

### Phase 4 — B2B Layer (ปีที่ 3–4 ขนานกัน)
- Dashboard สำหรับโรงเรียน/ติวเตอร์ติดตามนักเรียนทั้งห้อง
- ราคา: 500–2,000 บาท/เดือน/ห้อง
- เป้า: 125 โรงเรียน × 3 ห้อง × 1,000 บาท = **375,000 บาท/เดือน** (marginal cost แทบ 0)

### Revenue Projection รวม

> ปรับให้สอดคล้องกับ Cash Flow แล้ว (เดิมปีที่ 1 สูงไป ~10 เท่า) — ตัวเลขเป็น **gross revenue/เดือน เฉลี่ยช่วงพีค**

| ช่วงเวลา | Revenue/เดือน (peak season) | สมมติฐานหลัก |
|---------|--------------|--------------|
| ปีที่ 1 | 30,000–130,000 บาท | 1 วิชา (Math), 2,000-3,000 users, conv 20-35% |
| ปีที่ 2 | 150,000–400,000 บาท | 4 วิชาครบ, 5,000-8,000 users |
| ปีที่ 3 | 500,000–1,200,000 บาท | + สายศิลป์-คำนวณ + เริ่ม B2B |
| ปีที่ 4 | 1,500,000–3,000,000 บาท | + Cert อื่น (ก.พ.) + B2B layer เต็มตัว |

> ⚠️ ตัวเลขนี้ **ไม่ได้หักค่าธรรมเนียม/CAC/เงินเดือน** และ **อ่อนไหวกับ conversion มาก** — ต้อง validate conversion จริงก่อน

---

## Risks & Mitigation

| ความเสี่ยง | ระดับ | วิธีแก้ |
|-----------|------|--------|
| **Conversion ต่ำกว่าคาด** | **สูงสุด** | 50% เดิมเวอร์ไป → **validate ด้วย waitlist/pre-order ก่อนสร้าง bank เต็ม**; ถ้าจริง <12% โมเดลขาดทุนปี 1 |
| Content quality ผิดพลาด | สูง | Cross-model verification + user report + confidence scoring **— แต่ "2 โมเดลตอบตรงกัน ≠ ถูก" (correlated error โดยเฉพาะโจทย์ยาก/ภาษาไทย)** → ต้อง **human spot-check ชุด mock/90+** เพิ่ม |
| **Pre-launch capital สูงกว่าคิด** | **สูง** | ต้องเตรียม **~180k** ไม่ใช่ 32k → ใช้ Batch API / launch bank เล็ก (30k) แล้วทยอยเติม |
| **App Store cut 15-30%** | กลาง | ผลักการจ่ายเงินไป **web checkout** (Stripe/Omise) เลี่ยง store fee |
| Seasonal churn หลังสอบ | กลาง | Target ม.5 เป็น off-season strategy |
| Cold start (ไม่มี users ตอนแรก) | กลาง | Free 2 เดือน + short form content + Social mode viral loop |
| API cost เพิ่มขึ้น | ต่ำ | ทิศทาง AI ราคาขาลง แต่ควร monitor |
| ถูก clone | กลาง | Moat คือ brand + data flywheel + community ไม่ใช่ tech (อ่อนช่วงแรก → ชนะด้วย first-mover + speed) |
| Solo founder scaling limit | สูง (ระยะยาว) | วางแผน hire / co-founder ก่อน Phase 3 |

---

## Tech Stack (เสนอ)

| Layer | ตัวเลือก | เหตุผล |
|-------|---------|--------|
| DB | Supabase Pro | PostgreSQL + Realtime built-in รองรับ WebSocket |
| AI Generation | Claude Sonnet 4 | Cost ต่ำ quality ดี |
| AI Verification | GPT-4o | Cross-model independence |
| Backend | Supabase Functions / Railway | Simple, cost-effective |
| Auth | Supabase Auth | Built-in |

---

## Key Decisions Log

- **ราคา:** เปลี่ยนจาก 80/200 → **99/249 บาท** (perceived value ดีกว่า, revenue +56%)
- **QC:** ใช้ cross-model verification แทน human review (cost-effective ที่ scale นี้)
- **Bank size:** 100,000 โจทย์ก่อน launch, เติม 10,000/เดือน (dynamic ตาม sub-pool)
- **Recycle:** 90-day lock หลัง user ทำแล้ว ลด pool size ที่ต้องการลงมาก
- **Launch timing:** กันยายน (จับ TCAS peak ช่วง พ.ย.–ม.ค.)
- **Social mode:** Token แยกกัน social → practice ได้ แต่กลับไม่ได้
