-- questions: อ่านได้ทุกคน (authenticated) เฉพาะ active; เขียนผ่าน service-role เท่านั้น
alter table questions enable row level security;
create policy "read active questions" on questions
  for select to authenticated using (status = 'active');

-- user-owned tables: เจ้าของเท่านั้น
alter table user_question_locks enable row level security;
create policy "own locks" on user_question_locks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_attempts enable row level security;
create policy "own attempts" on user_attempts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table user_ratings enable row level security;
create policy "own ratings" on user_ratings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table tokens enable row level security;
create policy "own tokens" on tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table subscriptions enable row level security;
create policy "own subscription" on subscriptions
  for select to authenticated using (user_id = auth.uid());

-- RLS policies เป็น row-filter เท่านั้น — Postgres ยังต้องมี table grant แยกเสมอ
-- ให้ anon select ได้ (RLS กรองทุก row ออกเพราะ policy จำกัด authenticated เท่านั้น = ได้ผลลัพธ์ [] ไม่ใช่ permission error)
grant select on table questions to anon;
grant select on table questions to authenticated;
grant select, insert, update, delete on table user_question_locks to authenticated;
grant select, insert, update, delete on table user_attempts to authenticated;
grant select, insert, update, delete on table user_ratings to authenticated;
grant select, insert, update, delete on table tokens to authenticated;
grant select on table subscriptions to authenticated;
