-- subjects/topics เก็บเป็น text (v1: 'math','physics'); 15 topics x 5 difficulty = 75 sub-pools
create table questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null,
  difficulty_level int not null check (difficulty_level between 1 and 5),
  difficulty_value double precision not null,          -- granular, calibrated
  rating_deviation double precision not null default 350, -- Glicko RD (สูง = ผันผวน)
  difficulty_frozen boolean not null default true,     -- cold-start anchor (§5.2)
  confidence_score double precision not null default 70,
  mock_eligible boolean not null default false,        -- derived: confidence >= 90
  curriculum_version text not null default 'tcas-2569',
  status text not null default 'active' check (status in ('active','suspended','removed')),
  body jsonb not null,                                 -- โจทย์ + choices + เฉลย + วิธีทำ
  created_at timestamptz not null default now()
);
create index questions_subpool_idx on questions (subject, topic, difficulty_level, status);

-- per-user lock: ทำแล้ว lock 30 วัน (practice เท่านั้น; social ไม่สน)
create table user_question_locks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  lock_until timestamptz not null,
  primary key (user_id, question_id)
);
create index locks_user_until_idx on user_question_locks (user_id, lock_until);

create table user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  correct boolean not null,
  time_spent_ms int,
  context text not null check (context in ('practice','social','mock')),
  count_in_calibration boolean not null default true,  -- false = social repeat-exposure (§5.2 W5)
  created_at timestamptz not null default now()
);
create index attempts_question_idx on user_attempts (question_id);
create index attempts_user_idx on user_attempts (user_id, created_at);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ (ไม่งั้น "permission denied")
grant select, insert, update, delete on table questions, user_question_locks, user_attempts to service_role;
