-- ORCA LUNCH: the daily challenge and the end-of-game rating. Run once, after
-- supabase/protect-and-stats.sql, in the SQL editor. Safe to run again.
--
-- 1. A day's challenge has its own ranking, named after the world's ranking plus the date
--    (ocean-v0.6-d20261021). Each player gets one score in it: only the first attempt counts.
--    Its scores are taken only on that day or the next (Barcelona time), for games that end after
--    midnight.
-- 2. Stats: a new 'rating' event (the one-tap "T'ha agradat? 👍👎" at the end of a game; the answer
--    goes in meta.value).

-- 1. Daily challenge ---------------------------------------------------------------------------

create unique index if not exists scores_daily_once on public.scores (ranking, player_id)
  where ranking ~ '-d[0-9]{8}$';

create or replace function public.scores_daily_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  day date;
  today date := (now() at time zone 'Europe/Madrid')::date;
begin
  if new.ranking ~ '-d[0-9]{8}$' then
    day := to_date(substring(new.ranking from '-d([0-9]{8})$'), 'YYYYMMDD');
    if day not in (today, today - 1) then
      raise exception 'not today''s challenge' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists scores_daily_window on public.scores;
create trigger scores_daily_window before insert on public.scores
  for each row execute function public.scores_daily_window();

revoke execute on function public.scores_daily_window() from public, anon, authenticated;

-- 2. Rating ------------------------------------------------------------------------------------

alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('visit', 'game_start', 'game_end', 'share', 'install', 'ranking_view', 'feedback', 'rating'));
