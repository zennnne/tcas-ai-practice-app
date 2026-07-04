-- candidate flag: ผ่าน auto-conditions แต่ยัง human spot-check (cold start)
alter table questions add column if not exists promote_candidate boolean not null default false;

-- job: คำนวณ stats ต่อ question → set promote_candidate (mock_eligible set โดยคน/auto ตาม phase)
-- 🏠 บ้านเดียวของเงื่อนไข promote §4.7 (ADR-0001: one home per rule — ห้ามมี TS mirror)
--   AND: usage ≥ 50 · report rate < 0.05 · good rating ratio ≥ 0.7 (ไม่มี rating = ไม่ผ่าน,
--   evidence bar แบบ strict) · RD < 100 · confidence ≥ 70
-- ⏳ discrimination ≥ 0.2 (สเปค §4.7) ยังไม่ implement — ไม่มีคอลัมน์/สูตรใน schema;
--   ช่วง cold start คนตรวจมือทุก candidate จึงเลื่อนได้ แต่**ต้องเพิ่มก่อนเปิด auto-promote trigger**
create or replace function flag_promote_candidates() returns void language plpgsql as $$
begin
  update questions q set promote_candidate = true
  where q.confidence_score >= 70 and not q.mock_eligible and q.status = 'active'
    and q.rating_deviation < 100
    and (select count(*) from user_attempts a where a.question_id = q.id) >= 50
    and coalesce(
      (select count(*)::float from reports r where r.question_id = q.id)
      / nullif((select count(*) from user_attempts a2 where a2.question_id = q.id), 0),
      0
    ) < 0.05
    and coalesce(
      (select (count(*) filter (where rt.score = 'good'))::float / nullif(count(*), 0)
         from ratings rt where rt.question_id = q.id),
      0
    ) >= 0.7;
end; $$;
-- cold start: คนตรวจ candidate → set mock_eligible=true, confidence_score=90
-- เมื่อ auto พิสูจน์แม่น: ใช้ trigger ตั้ง mock_eligible อัตโนมัติจาก promote_candidate
