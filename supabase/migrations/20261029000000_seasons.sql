-- Acedle: season mode. A player takes one of their cards (a roll) through a
-- season of 4 Slams, 9 Masters and the ATP Finals (src/lib/season). Like a
-- tournament, a season is its setup (the rival field, entry lists and seed)
-- plus the player's sets in order; everything else is worked out from those.
-- The server appends sets one at a time and keeps the season's summary
-- (record, titles, points) up to date for listings and the leaderboard.
--
-- A season belongs to whoever owns its card, so it moves with the card when
-- a guest's rolls move to a new account. One season in progress at a time.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  roll_id uuid not null references public.rolls (id) on delete cascade,
  -- The card's player-season, for listings.
  year smallint not null,
  player_id integer not null,
  player_name text not null,
  -- src/lib/season/season.ts, SeasonSetup.
  setup jsonb not null,
  -- The player's sets so far, in order (true = won).
  sets boolean[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'finished', 'abandoned')),
  wins smallint not null default 0,
  losses smallint not null default 0,
  titles smallint not null default 0,
  points integer not null default 0,
  -- Won all four Slams.
  calendar_slam boolean not null default false,
  created_at timestamptz not null default now(),
  -- Last set played (guest cleanup counts it as activity).
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index seasons_roll_id_idx on public.seasons (roll_id);
create index seasons_active_idx on public.seasons (roll_id) where status = 'active';
create index seasons_best_idx on public.seasons (wins desc, losses, points desc) where status = 'finished';

alter table public.seasons enable row level security;

-- Readable by whoever owns the card. Season pages read with the service role
-- (anyone with a season's link can see it, as with rolls).
create policy "Users can read their own seasons" on public.seasons
  for select to authenticated
  using (exists (select 1 from public.rolls r where r.id = roll_id and r.user_id = (select auth.uid())));

revoke all on public.seasons from anon, authenticated;
grant select on public.seasons to authenticated;
grant select, insert, update, delete on public.seasons to service_role;

-- Starts a season with card `p_roll_id`, unless its owner already has one in
-- progress (then returns null). Locks per owner, so two tabs can't both start one.
create function public.season_start(p_roll_id uuid, p_setup jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_id uuid;
begin
  select user_id into v_owner from public.rolls where id = p_roll_id;
  if v_owner is null then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('season:' || v_owner::text, 0));
  if exists (
    select 1 from public.seasons s
    join public.rolls r on r.id = s.roll_id
    where r.user_id = v_owner and s.status = 'active'
  ) then
    return null;
  end if;
  insert into public.seasons (roll_id, year, player_id, player_name, setup)
  values (
    p_roll_id,
    (p_setup -> 'you' ->> 'year')::smallint,
    (p_setup -> 'you' ->> 'playerId')::integer,
    p_setup -> 'you' ->> 'name',
    p_setup
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Appends one set if the season is in progress and still has `p_expected`
-- sets, so two tabs can't both record the same set, and stores the summary
-- the server worked out for the season with that set. `p_finished` ends it.
create function public.season_add_set(
  p_id uuid,
  p_expected integer,
  p_won boolean,
  p_wins smallint,
  p_losses smallint,
  p_titles smallint,
  p_points integer,
  p_calendar_slam boolean,
  p_finished boolean
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.seasons
    set sets = sets || p_won,
        wins = p_wins,
        losses = p_losses,
        titles = p_titles,
        points = p_points,
        calendar_slam = p_calendar_slam,
        status = case when p_finished then 'finished' else 'active' end,
        finished_at = case when p_finished then now() else null end,
        updated_at = now()
    where id = p_id
      and cardinality(sets) = p_expected
      and status = 'active'
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke execute on function public.season_start(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.season_start(uuid, jsonb) to service_role;
revoke execute on function public.season_add_set(uuid, integer, boolean, smallint, smallint, smallint, integer, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.season_add_set(uuid, integer, boolean, smallint, smallint, smallint, integer, boolean, boolean)
  to service_role;

-- Guest cleanup: playing a season counts as activity, like rolling.
create or replace function public.delete_stale_guests(p_days integer default 30)
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - make_interval(days => p_days)
      and not exists (
        select 1 from public.rolls r
        where r.user_id = u.id and r.day >= current_date - p_days
      )
      and not exists (
        select 1 from public.seasons s
        join public.rolls r on r.id = s.roll_id
        where r.user_id = u.id and s.updated_at >= now() - make_interval(days => p_days)
      )
    returning 1
  )
  select count(*)::integer from deleted;
$$;
