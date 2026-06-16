create table tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  practice_balance double precision not null default 0,  -- double: รองรับโอน social→practice 1:0.5
  social_balance double precision not null default 0,
  updated_at timestamptz not null default now()
  -- cap 7 วัน worth บังคับใน application logic (P2/P3) ไม่ใช่ DB constraint
);

create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free' check (tier in ('free','tier1','tier2')),
  status text not null default 'trial'
    check (status in ('trial','trial_expired_free','free','paid')),
  trial_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert, update, delete on table tokens, subscriptions to service_role;
