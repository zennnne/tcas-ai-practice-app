-- 0013_indexes.sql — hot query path index audit
-- DO NOT edit existing migrations (0001–0011); add only here.
-- Verified against code in: src/lib/attempts/record.ts, src/app/actions/mock.ts,
--   src/app/actions/quality.ts, src/app/actions/social.ts, supabase/migrations/0011_moderation.sql
--
-- Existing indexes already in place (no duplicates added):
--   questions_subpool_idx  (subject, topic, difficulty_level, status)     → serving.ts pickQuestion
--   locks_user_until_idx   (user_id, lock_until)                          → serving.ts lock fetch
--   attempts_question_idx  (question_id)                                  → promote_job subquery count
--   attempts_user_idx      (user_id, created_at)                          → general user timeline

-- ============================================================
-- 1. user_attempts: hot repeat-exposure check (every social answer)
-- ============================================================
-- Query: record.ts hasRecentAttempt
--   SELECT count(*) FROM user_attempts
--   WHERE user_id = $1 AND question_id = $2 AND created_at >= $3
--
-- Existing attempts_user_idx (user_id, created_at) forces a heap scan to
-- then filter question_id; for a user with many recent attempts this becomes
-- an unnecessary fanout.  Composite (user_id, question_id, created_at) turns
-- the lookup into a tight index range scan and covers the COUNT with no heap
-- access for the head:true (Supabase count-only) request.
create index idx_user_attempts_user_question_date
  on user_attempts (user_id, question_id, created_at);

-- ============================================================
-- 2. questions: mock assembly pool fetch (startMock)
-- ============================================================
-- Query: actions/mock.ts startMock
--   SELECT id, topic, mock_eligible FROM questions
--   WHERE subject = $1 AND mock_eligible = true AND status = 'active'
--
-- Existing questions_subpool_idx (subject, topic, difficulty_level, status)
-- does not include mock_eligible; the planner cannot filter on it at index
-- level and must heap-check every row for that subject.
-- A partial index restricted to mock_eligible=true AND status='active' is
-- tiny (only >=90-confidence active questions), so write overhead is minimal.
create index idx_questions_mock_pool
  on questions (subject, topic)
  where mock_eligible = true and status = 'active';

-- ============================================================
-- 3. reports: background job subquery — recompute_quality + flag_promote_candidates
-- ============================================================
-- Query (run every 15 min in a loop over all active questions):
--   SELECT ... FROM reports WHERE question_id = q.id
--
-- Without this index the job executes a sequential scan on reports for
-- every question in the loop → O(N x M) where N=active questions, M=reports.
-- This is the most critical missing index for background correctness.
create index idx_reports_question
  on reports (question_id);

-- ============================================================
-- 4. reports: per-user duplicate check + daily quota check (submitReport)
-- ============================================================
-- Queries: actions/quality.ts submitReport (run in parallel Promise.all)
--   a) SELECT id FROM reports WHERE user_id = $1 AND question_id = $2  (duplicate check)
--   b) SELECT count(*) FROM reports WHERE user_id = $1 AND created_at >= today (daily quota)
--
-- For (a): exact point lookup — (user_id, question_id) covers it perfectly.
-- For (b): user_id prefix of this index filters to one user's reports; the
--   daily quota is capped at DAILY_REPORT_LIMIT=10 so Postgres checks at most
--   10 rows in the heap for created_at — trivially fast given the user_id index.
create index idx_reports_user_question
  on reports (user_id, question_id);
