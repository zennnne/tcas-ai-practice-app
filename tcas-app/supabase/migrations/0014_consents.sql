-- 0014_consents.sql — PDPA consent recording (issue #4)
-- Records per-user consent to a specific policy version at signup.
-- Designed for multi-version re-consent: each policy bump creates a new row.
-- DO NOT edit existing migrations (0001–0013); add only here.

create table consents (
  id             bigserial   primary key,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  policy_version text        not null,
  consented_at   timestamptz not null default now()
);

-- Index: look up the latest consent for a given user+version (re-consent check)
create index idx_consents_user_version
  on consents (user_id, policy_version, consented_at desc);

-- RLS: owner-only read/insert; no update/delete — consent rows are immutable
alter table consents enable row level security;
create policy "own consents" on consents
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert on table consents to authenticated;
grant select, insert on table consents to service_role;
