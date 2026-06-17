create table faculty_cutoffs (
  faculty text primary key,
  min_score double precision not null,   -- คะแนนต่ำสุดที่เคยติด (ปีก่อน)
  median_score double precision not null
);
-- seed ตัวอย่าง (เติมจริงจากสถิติ TCAS ภายหลัง — TBD data source)
insert into faculty_cutoffs values
  ('วิศวะ จุฬา', 75, 82), ('แพทย์ มหิดล', 85, 90), ('บัญชี ธรรมศาสตร์', 68, 74);

grant select on table faculty_cutoffs to service_role, anon, authenticated;
