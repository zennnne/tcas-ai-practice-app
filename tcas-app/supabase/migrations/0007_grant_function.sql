create or replace function grant_daily_tokens() returns void language plpgsql as $$
begin
  -- tier1: +1 practice / +1 social, cap 7 each
  -- tier2: +3 practice / +2 social, cap 21 / 14
  update tokens t set
    practice_balance = least(t.practice_balance +
      case s.tier when 'tier1' then 1 when 'tier2' then 3 else 0 end,
      case s.tier when 'tier1' then 7 when 'tier2' then 21 else 0 end),
    social_balance = least(t.social_balance +
      case s.tier when 'tier1' then 1 when 'tier2' then 2 else 0 end,
      case s.tier when 'tier1' then 7 when 'tier2' then 14 else 0 end),
    updated_at = now()
  from subscriptions s
  where s.user_id = t.user_id and s.status in ('trial', 'paid');
end; $$;

-- pg_cron schedule (uncomment เมื่อ enable extension บน Supabase):
-- select cron.schedule('daily-grant', '0 0 * * *', 'select grant_daily_tokens()');
