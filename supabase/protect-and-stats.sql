-- ANIMAL FEAST: protect the public ranking, and cookie-free stats and feedback. Run once, after
-- supabase/leaderboard.sql, in the SQL editor. Safe to run again.
--
-- What it does:
-- 1. Names: a list of banned words (generated from supabase/banned-words.txt), checked on every
--    new score, the same way the game checks them before sending.
-- 2. Scores: at most 400,000 (fast greedy bots top out around 236,000 in the simulator), at least
--    100 s between two scores of one player (a game lasts 2 minutes) and at most 60 a day.
-- 3. Moderation: set scores.hidden = true on a row (Table editor) to take it off the ranking.
-- 4. Stats: an `events` table the game only writes to (visits, games, shares, installs), keyed by a
--    random id kept on the phone. No cookies, no names, nothing personal. The public key can't
--    read it; see supabase/stats-queries.sql for the numbers.
-- 5. Feedback: a `feedback` table the game only writes to (at most 10 messages a day per phone).

-- 1. Banned words -------------------------------------------------------------------------------

create table if not exists public.banned_words (word text primary key check (word ~ '^[a-z]+$'));
alter table public.banned_words enable row level security; -- no policies: the public can't read it

insert into public.banned_words (word) values
  ('puta'),
  ('puto'),
  ('putes'),
  ('merda'),
  ('mierda'),
  ('cabron'),
  ('collons'),
  ('cojones'),
  ('polla'),
  ('follar'),
  ('joder'),
  ('gilipollas'),
  ('subnormal'),
  ('maricon'),
  ('marica'),
  ('bollera'),
  ('zorra'),
  ('malparit'),
  ('capullo'),
  ('pendejo'),
  ('verga'),
  ('culero'),
  ('retrasado'),
  ('negrata'),
  ('sudaca'),
  ('panchito'),
  ('nazi'),
  ('hitler'),
  ('fuck'),
  ('shit'),
  ('bitch'),
  ('cunt'),
  ('pussy'),
  ('nigger'),
  ('nigga'),
  ('faggot'),
  ('whore'),
  ('slut'),
  ('porn'),
  ('penis'),
  ('vagina'),
  ('asshole'),
  ('bastard'),
  ('wank'),
  ('twat'),
  ('chink'),
  ('retard')
on conflict do nothing;

-- Same normalisation as the game (src/leaderboard/names.ts): lowercase, no accents, digits and
-- symbols read as letters, only letters kept.
create or replace function public.normalize_name(raw text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(lower(raw), 'àáâäãèéêëìíîïòóôöõùúûüçñ013457@$', 'aaaaaeeeeiiiiooooouuuucnoieastas'),
    '[^a-z]', '', 'g')
$$;

create or replace function public.name_is_clean(raw text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.banned_words b where position(b.word in public.normalize_name(raw)) > 0)
$$;

-- 2 and 3. Scores ------------------------------------------------------------------------------

alter table public.scores add column if not exists hidden boolean not null default false;
alter table public.scores drop constraint if exists scores_score_check;
alter table public.scores add constraint scores_score_check check (score between 1 and 400000) not valid;

drop policy if exists "anyone adds a score" on public.scores;
create policy "anyone adds a score" on public.scores
  for insert to anon, authenticated
  with check (public.name_is_clean(name) and not hidden);

create or replace function public.scores_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.scores
             where player_id = new.player_id and created_at > now() - interval '100 seconds') then
    raise exception 'too many scores' using errcode = 'P0001';
  end if;
  if (select count(*) from public.scores
      where player_id = new.player_id and created_at > now() - interval '1 day') >= 60 then
    raise exception 'too many scores today' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists scores_rate_limit on public.scores;
create trigger scores_rate_limit before insert on public.scores
  for each row execute function public.scores_rate_limit();

create or replace view public.leaderboard with (security_invoker = true) as
select distinct on (ranking, player_id)
  ranking, player_id, name, score, created_at
from public.scores
where not hidden
order by ranking, player_id, score desc, created_at desc;

grant select on public.leaderboard to anon, authenticated;

-- 4. Stats -------------------------------------------------------------------------------------

create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device_id uuid not null,
  kind text not null check (kind in ('visit', 'game_start', 'game_end', 'share', 'install', 'ranking_view', 'feedback')),
  score integer check (score between 0 and 400000),
  meta jsonb not null default '{}'::jsonb check (pg_column_size(meta) < 1000)
);
create index if not exists events_created on public.events (created_at);
create index if not exists events_device on public.events (device_id, created_at);
alter table public.events enable row level security;
drop policy if exists "the game adds events" on public.events;
create policy "the game adds events" on public.events for insert to anon, authenticated with check (true);
grant insert on public.events to anon, authenticated;

-- 5. Feedback ----------------------------------------------------------------------------------

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device_id uuid not null,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  meta jsonb not null default '{}'::jsonb check (pg_column_size(meta) < 1000)
);
alter table public.feedback enable row level security;
drop policy if exists "the game adds feedback" on public.feedback;
create policy "the game adds feedback" on public.feedback for insert to anon, authenticated with check (true);
grant insert on public.feedback to anon, authenticated;

create or replace function public.feedback_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback
      where device_id = new.device_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too much feedback today' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback
  for each row execute function public.feedback_rate_limit();
