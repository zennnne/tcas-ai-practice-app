# One home per rule — scheduled batch rules live in SQL, no TS mirrors

Scheduled batch rules (daily token grant, quality recompute, promote-candidate flag) เคยมี implementation สองชุด: plpgsql ใน `supabase/migrations/` (ตัวที่รันจริงผ่าน pg_cron) และ TS pure functions ใน `src/lib/` (มี unit test แต่ไม่มี caller) — สองชุด drift กันจริงแล้ว (สูตร reporter weight กับเงื่อนไข promote ไม่ตรงกัน) เราจึงตัดสินใจ: **กฎที่เป็น scheduled batch job มีบ้านเดียวคือ SQL** และ **ห้ามมี TS mirror** — invariant ถูกยึดด้วย integration test ที่เรียก `db.rpc()` กับ Supabase local (`tests/unit/sql-jobs.test.ts`) แทน unit test ของโค้ดที่ไม่ได้รัน

เหตุผลที่เลือก SQL ไม่ใช่ TS: งานเป็น set-based UPDATE ที่ SQL ถนัด อยู่ติดข้อมูล ไม่มี race · pg_cron ฟรี (recompute ทุก 15 นาที ไม่ต้องจ่าย Vercel Pro ซึ่งขัดหลัก cost-sensitive) · test infra เดิมรันกับ DB จริงอยู่แล้ว

## Consequences

- ห้าม port กฎเหล่านี้กลับไป TS "เพื่อให้ test ง่าย" — architecture review รอบหน้าอย่าเสนอซ้ำ ถ้า logic โตจน plpgsql อึดอัดจริง ให้เปิด ADR ใหม่มา supersede
- Pre-launch แก้ migration ของฟังก์ชันพวกนี้ in-place ได้ (1 ฟังก์ชัน = 1 นิยาม) · หลัง launch (มี remote apply แล้ว) ต้องเปลี่ยนเป็น append-only migration
- เงื่อนไข discrimination ≥ 0.2 ของ promote (สเปค §4.7) ถูกเลื่อน — ต้องเพิ่มก่อนเปิด auto-promote trigger (ช่วง cold start คนตรวจมือทุก candidate จึงยังปลอดภัย)
- Logic ฝั่ง user-action (เช่น social→practice transfer 1:0.5 ที่ยังไม่ได้สร้าง) ไม่อยู่ใต้ ADR นี้ — ตัดสินบ้านตอน build feature (แนวโน้ม SQL RPC เพื่อ atomicity)
