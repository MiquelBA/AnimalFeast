-- ANIMAL FEAST shared leaderboard (Supabase / Postgres). Run once in the SQL editor.
-- Anyone with the public (anon) key can read the ranking and add a score; nobody can change or
-- delete one from the game. There are no accounts: a player is a random id kept on their phone.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  ranking text not null check (ranking ~ '^[a-z0-9.-]{1,32}$'),
  player_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 16),
  score integer not null check (score between 1 and 10000000)
);

create index if not exists scores_ranking_score on public.scores (ranking, score desc);

alter table public.scores enable row level security;

drop policy if exists "anyone reads scores" on public.scores;
create policy "anyone reads scores" on public.scores
  for select to anon, authenticated using (true);

drop policy if exists "anyone adds a score" on public.scores;
create policy "anyone adds a score" on public.scores
  for insert to anon, authenticated with check (true);

-- No update or delete policies: with RLS on, those are refused.

-- Each player's best score per ranking, with the name they used for it. Runs with the caller's rights, so
-- the policies above apply.
create or replace view public.leaderboard with (security_invoker = true) as
select distinct on (ranking, player_id)
  ranking, player_id, name, score, created_at
from public.scores
order by ranking, player_id, score desc, created_at desc;

grant select on public.leaderboard to anon, authenticated;
grant select, insert on public.scores to anon, authenticated;
