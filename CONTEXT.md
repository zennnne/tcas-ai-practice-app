# TCAS AI Practice App

Subscription app ใช้ AI ผลิตโจทย์เตรียมสอบ TCAS — glossary นี้คือภาษากลางของโปรเจกต์ (คำจำกัดความ ไม่ใช่ spec; รายละเอียดกลไกดู design doc)

## Language

### Content quality

**Confidence**:
คะแนน 0–100 ต่อโจทย์ ว่าเชื่อได้แค่ไหนว่าโจทย์ถูกต้อง — ขยับลงจาก report (ถ่วง Reporter Weight) และขยับเบาๆ จาก rating
_Avoid_: quality score, trust score

**Quality Recompute**:
Batch job (ทุก ~15 นาที) คำนวณ Confidence ใหม่ทุกโจทย์ active แล้ว route ผล: mock-eligible ตก <90 → Review Queue · practice ตกฟลอร์ <50 → suspend
_Avoid_: moderation job, confidence job

**Reporter Weight**:
ตัวคูณความน่าเชื่อของคน report = clamp(0.5 + accuracy×1.5, 0..2), user ใหม่ = 1.0 — คนแม่นเสียงดังขึ้น คนมั่วเสียงเบาลงแต่ไม่เงียบสนิท
_Avoid_: reputation score

**Review Queue**:
คิวโจทย์ mock-eligible ที่ Confidence ตก รอคนตรวจมือ (high-stakes ไม่ auto-remove)

**Promotion Flag**:
Batch job ติดธง `promote_candidate` ให้โจทย์ที่ผ่านเกณฑ์ §4.7 (usage, report rate, rating, RD) — การเลื่อนเป็น mock-eligible จริงยังเป็นการตัดสินของคนช่วง cold start
_Avoid_: auto-promote (นั่นคือ trigger อนาคตที่ยังไม่เปิด)

### Tokens

**Daily Grant**:
Batch job แจก token รายวันตาม tier ให้ subscription ที่ trial/paid เท่านั้น — สะสมได้ไม่เกิน 7 วัน (cap = grant×7)
_Avoid_: token refill, allowance

**One home per rule**:
หลักว่ากฎ scheduled batch (Daily Grant, Quality Recompute, Promotion Flag) มี implementation เดียวใน SQL — ห้ามมี TS mirror (ADR-0001)
