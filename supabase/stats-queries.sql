-- ANIMAL FEAST: the numbers (paste any block into Supabase's SQL editor). A "player" is a phone:
-- a random id the game keeps on it, nothing personal. Times are UTC.

-- Players and games per day (last 30 days).
select date_trunc('day', created_at)::date as day,
       count(distinct device_id) filter (where kind = 'visit') as players,
       count(*) filter (where kind = 'game_start') as games_started,
       count(*) filter (where kind = 'game_end') as games_finished,
       round(avg(score) filter (where kind = 'game_end')) as avg_score,
       count(*) filter (where kind = 'share') as shares,
       count(*) filter (where kind = 'install') as installs
from events
where created_at > now() - interval '30 days'
group by 1 order by 1 desc;

-- Games per player: how many finish 1, 2-4, 5-9, 10+ games.
select case when n = 1 then '1' when n < 5 then '2-4' when n < 10 then '5-9' else '10+' end as games,
       count(*) as players
from (select device_id, count(*) as n from events where kind = 'game_end' group by 1) g
group by 1 order by min(n);

-- Do they come back? Players by number of different days they played.
select days, count(*) as players
from (select device_id, count(distinct created_at::date) as days from events where kind = 'visit' group by 1) d
group by 1 order by 1;

-- Day-1 and day-7 return: of the players first seen on each day, how many came back later.
with first as (select device_id, min(created_at::date) as d0 from events where kind = 'visit' group by 1)
select d0 as first_day, count(*) as new_players,
       count(*) filter (where exists (select 1 from events e where e.device_id = f.device_id and e.created_at::date = f.d0 + 1)) as back_next_day,
       count(*) filter (where exists (select 1 from events e where e.device_id = f.device_id and e.created_at::date between f.d0 + 1 and f.d0 + 7)) as back_within_week
from first f group by 1 order by 1 desc;

-- Latest feedback.
select created_at, message, meta from feedback order by created_at desc limit 50;

-- 👍👎 at the end of a game, per day.
select date_trunc('day', created_at)::date as day,
       count(*) filter (where meta->>'value' = 'up') as likes,
       count(*) filter (where meta->>'value' = 'down') as dislikes
from public.events where kind = 'rating'
group by 1 order by 1 desc;

-- Daily challenge: players and best score per day.
select ranking, count(*) as players, max(score) as best
from public.leaderboard where ranking ~ '-d[0-9]{8}$'
group by 1 order by 1 desc;
