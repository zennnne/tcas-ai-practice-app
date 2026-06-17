-- candidate flag: ผ่าน auto-conditions แต่ยัง human spot-check (cold start)
alter table questions add column if not exists promote_candidate boolean not null default false;

-- job: คำนวณ stats ต่อ question → set promote_candidate (mock_eligible set โดยคน/auto ตาม phase)
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
    ) < 0.05;
end; $$;
-- cold start: คนตรวจ candidate → set mock_eligible=true, confidence_score=90
-- เมื่อ auto พิสูจน์แม่น: ใช้ trigger ตั้ง mock_eligible อัตโนมัติจาก promote_candidate
