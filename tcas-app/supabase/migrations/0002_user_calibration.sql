-- Glicko state ต่อ (user, subject, topic) — true rank (persistent layer §5.2)
create table user_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  true_rank double precision not null default 1500,    -- Glicko rating
  rd double precision not null default 350,             -- rating deviation (สูง = ใหม่/ผันผวน)
  updated_at timestamptz not null default now(),
  primary key (user_id, subject, topic)
);

-- skill tier 1-5 derived จาก true_rank (denormalized เพื่อ query/UX เร็ว)
create table skill_tier (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  topic text not null,
  tier int not null default 3 check (tier between 1 and 5),
  primary key (user_id, subject, topic)
);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert, update, delete on table user_ratings, skill_tier to service_role;
