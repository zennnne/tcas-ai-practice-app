-- review queue สำหรับ mock-eligible ที่ถูก report (พี่ตรวจมือ)
create table review_queue (
  question_id uuid primary key references questions(id) on delete cascade,
  reason text not null default 'confidence_drop',
  enqueued_at timestamptz not null default now(),
  resolved boolean not null default false
);

-- reporter reputation (confirmed/rejected จาก outcome ของ review)
create table user_reputation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  confirmed_reports int not null default 0,
  rejected_reports int not null default 0
);

-- recompute job: คำนวณ confidence ใหม่ต่อโจทย์ → apply action
-- (รันเป็นรอบ เช่น ทุก 15 นาที ผ่าน pg_cron)
-- 🏠 บ้านเดียวของกฎ quality (ADR-0001: one home per rule — ห้ามมี TS mirror)
--   penalty ×8 / report (ถ่วง reporter weight) · ratingAdj ±5
--   reporter weight = clamp(0.5 + accuracy×1.5, 0..2) · user ใหม่ (ไม่มีประวัติ) = 1.0
--   practice floor < 50 → suspend · mock-eligible ตก < 90 → review queue
--   ค่าทั้งหมด tune ได้ตาม design doc §9
create or replace function recompute_quality() returns void language plpgsql as $$
declare q record; new_conf double precision; w_reports double precision;
        good_ct int; bad_ct int;
begin
  for q in select id, confidence_score, mock_eligible from questions where status = 'active' loop
    select coalesce(sum(r.weight * case
             when rep.user_id is null or rep.confirmed_reports + rep.rejected_reports = 0 then 1.0
             else greatest(0, least(2, 0.5 + (rep.confirmed_reports::float
                    / (rep.confirmed_reports + rep.rejected_reports)) * 1.5))
           end), 0)
      into w_reports
      from reports r left join user_reputation rep on rep.user_id = r.user_id
      where r.question_id = q.id;
    select count(*) filter (where score='good'), count(*) filter (where score='bad')
      into good_ct, bad_ct from ratings where question_id = q.id;

    new_conf := greatest(0, least(100, q.confidence_score - w_reports * 8 +
      case when good_ct + bad_ct = 0 then 0
           else ((good_ct - bad_ct)::float / (good_ct + bad_ct)) * 5 end));
    update questions set confidence_score = new_conf, mock_eligible = (new_conf >= 90) where id = q.id;

    -- route: mock-eligible ตก<90 → review; practice ตก<50 → suspend+regen flag
    if q.mock_eligible and new_conf < 90 then
      insert into review_queue (question_id) values (q.id) on conflict do nothing;
    elsif not q.mock_eligible and new_conf < 50 then
      update questions set status = 'suspended' where id = q.id;
    end if;
  end loop;
end; $$;
-- schedule: select cron.schedule('recompute-quality','*/15 * * * *','select recompute_quality()');

grant select, insert, update, delete on table review_queue, user_reputation to service_role;
