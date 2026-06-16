create table reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,                    -- บังคับเลือก (anti-spam)
  weight double precision not null default 1,
  created_at timestamptz not null default now()
);

create table ratings (
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score text not null check (score in ('good','neutral','bad')),
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_faculty text,                       -- v1.1 slot
  updated_at timestamptz not null default now()
);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert, update, delete on table reports, ratings, goals to service_role;
