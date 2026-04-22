-- Atomic increment for usage_logs to prevent read-modify-write race conditions
-- under concurrent detect/humanize requests from the same user.
create or replace function increment_usage_log(
  p_user_id uuid,
  p_date    date,
  p_words   integer
)
returns void
language sql
security definer
as $$
  insert into usage_logs (user_id, date, words_used)
  values (p_user_id, p_date, p_words)
  on conflict (user_id, date)
  do update set words_used = usage_logs.words_used + excluded.words_used;
$$;
