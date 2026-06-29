-- Track when a trial-expiry reminder was last sent to a user.
-- A simple nullable timestamp on subscriptions avoids a separate table while
-- still giving us dedup: NULL = no reminder sent yet.
alter table subscriptions
  add column if not exists trial_reminder_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Helper: fetch candidates whose trial ends within N days and haven't been
-- reminded yet. Called by the /api/jobs/trial-reminders cron endpoint.
-- ---------------------------------------------------------------------------
create or replace function get_trial_reminder_candidates(days_before int default 3)
returns table(user_id uuid, trial_ends_at timestamptz, email text)
language sql
security definer
stable
as $$
  select s.user_id, s.trial_ends_at, u.email
  from subscriptions s
  join auth.users u on u.id = s.user_id
  where s.status = 'trial'
    and s.trial_ends_at is not null
    and s.trial_reminder_sent_at is null
    and s.trial_ends_at > now()
    and s.trial_ends_at <= now() + (days_before || ' days')::interval;
$$;

-- ---------------------------------------------------------------------------
-- Helper: stamp trial_reminder_sent_at so the user doesn't get spammed.
-- ---------------------------------------------------------------------------
create or replace function mark_trial_reminder_sent(p_user_id uuid)
returns void
language sql
security definer
as $$
  update subscriptions
  set trial_reminder_sent_at = now()
  where user_id = p_user_id;
$$;

-- Grants (service_role bypass RLS but still needs explicit EXECUTE)
grant execute on function get_trial_reminder_candidates(int) to service_role;
grant execute on function mark_trial_reminder_sent(uuid) to service_role;
