-- Acedle: the "Best seasons" leaderboard. Each account's best finished
-- season (most wins, then fewest losses, then most points), accounts only
-- (guests have no profile). Public columns only, like the other boards.

create function public.season_leaderboard()
returns table (
  rank bigint,
  entries bigint,
  handle text,
  avatar_url text,
  season_id uuid,
  year smallint,
  player_id integer,
  player_name text,
  country text,
  wins smallint,
  losses smallint,
  titles smallint,
  points integer,
  calendar_slam boolean,
  is_viewer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select distinct on (r.user_id)
      r.user_id, s.id, s.year, s.player_id, s.player_name, s.setup -> 'you' ->> 'country' as country,
      s.wins, s.losses, s.titles, s.points, s.calendar_slam, s.finished_at
    from public.seasons s
    join public.rolls r on r.id = s.roll_id
    where s.status = 'finished'
    order by r.user_id, s.wins desc, s.losses, s.points desc, s.finished_at
  ),
  ranked as (
    select
      rank() over (order by b.wins desc, b.losses, b.points desc) as rank,
      row_number() over (order by b.wins desc, b.losses, b.points desc, b.finished_at, b.user_id) as pos,
      count(*) over () as entries,
      p.handle,
      p.avatar_url,
      b.id as season_id,
      b.year,
      b.player_id,
      b.player_name,
      b.country,
      b.wins,
      b.losses,
      b.titles,
      b.points,
      b.calendar_slam,
      coalesce(b.user_id = (select auth.uid()), false) as is_viewer
    from best b
    join public.profiles p on p.user_id = b.user_id
  )
  select rank, entries, handle, avatar_url, season_id, year, player_id, player_name, country,
    wins, losses, titles, points, calendar_slam, is_viewer
  from ranked
  where pos <= 100 or is_viewer
  order by pos;
$$;

revoke execute on function public.season_leaderboard() from public;
grant execute on function public.season_leaderboard() to anon, authenticated, service_role;
