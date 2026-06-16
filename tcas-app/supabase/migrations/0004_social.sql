create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                 -- private room join code
  host_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  settings jsonb not null,                   -- จำนวนข้อ/timer/mode/difficulty range
  question_ids uuid[] not null default '{}', -- ชุดโจทย์ที่สุ่มไว้ล่วงหน้า (fixed set)
  state text not null default 'waiting' check (state in ('waiting','in_progress','finished')),
  created_at timestamptz not null default now()
);

create table room_participants (
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  finished_at timestamptz,
  primary key (room_id, user_id)
);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert, update, delete on table rooms, room_participants to service_role;
