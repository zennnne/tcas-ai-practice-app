create or replace function expire_trials() returns void language sql as $$
  update subscriptions set status = 'trial_expired_free', updated_at = now()
  where status = 'trial' and trial_ends_at is not null and trial_ends_at <= now();
$$;
-- schedule: select cron.schedule('expire-trials','0 * * * *','select expire_trials()');
