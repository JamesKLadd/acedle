-- Acedle: the daily challenge. Each UTC day everyone gets the same card in
-- the same tournament draw (src/lib/challenge.ts): a 250 Monday to
-- Wednesday, a 500 on Thursday and Friday, a 1000 on Saturday and a Grand
-- Slam on Sunday. The server makes the day's challenge the first time anyone
-- opens it and keeps it, so it stays the same all day (even when the live
-- season's data changes). Each player's first run of the day is the ranked
-- one; replays after it stay in the browser.
--
-- Safe to apply before the code that uses it: it only adds tables and
-- functions, and redefines the guest claim and cleanup with challenge runs
-- added.

create table public.challenges (
  day date primary key,
  tier text not null check (tier in ('250', '500', '1000', 'slam')),
  -- The card's player-season as it was that day (PlayerSeason), and its score.
  card jsonb not null,
  score bigint not null check (score >= 0),
  -- The draw, as tournaments store it.
  entrants jsonb not null check (jsonb_array_length(entrants) in (16, 32)),
  you smallint not null check (you >= 0 and you < jsonb_array_length(entrants)),
  seed bigint not null check (seed between 0 and 4294967295),
  created_at timestamptz not null default now(),
  constraint challenges_tier_size_check check ((tier = 'slam') = (jsonb_array_length(entrants) = 32))
);

-- Written and read by the server only: pages read it with the service role.
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;
grant select, insert, update, delete on public.challenges to service_role;

create table public.challenge_runs (
  day date not null references public.challenges (day) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The player's sets so far, in order (true = won).
  sets boolean[] not null default '{}',
  sets_lost smallint not null default 0,
  -- Once the run is over: rounds won (all of them = champion).
  rounds_won smallint check (rounds_won between 0 and 5),
  created_at timestamptz not null default now(),
  -- When the run started or its last set was recorded.
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (day, user_id)
);

create index challenge_runs_board_idx on public.challenge_runs (day, rounds_won desc, sets_lost, finished_at)
  where rounds_won is not null;
create index challenge_runs_user_idx on public.challenge_runs (user_id, day desc);

alter table public.challenge_runs enable row level security;

create policy "Users can read their own challenge runs" on public.challenge_runs
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.challenge_runs from anon, authenticated;
grant select on public.challenge_runs to authenticated;
grant select, insert, update, delete on public.challenge_runs to service_role;

-- Appends one set to a run if it still has `p_expected` sets and isn't over
-- (so two tabs can't both record the same set), and only if at least half a
-- second has passed since the run started or its last set: a real set takes
-- longer, so a quicker one wasn't played. `p_rounds_won` is the result once
-- this set ends the run (the server works it out), else null.
-- Returns 'added', 'stale' (nothing to add to: refetch) or 'too-fast'.
create function public.challenge_add_set(
  p_day date,
  p_user_id uuid,
  p_expected integer,
  p_won boolean,
  p_rounds_won smallint default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_at timestamptz;
begin
  select updated_at into last_at
  from public.challenge_runs
  where day = p_day
    and user_id = p_user_id
    and cardinality(sets) = p_expected
    and rounds_won is null
  for update;

  if not found then
    return 'stale';
  end if;
  if clock_timestamp() - last_at < interval '500 milliseconds' then
    return 'too-fast';
  end if;

  update public.challenge_runs
  set sets = sets || p_won,
      sets_lost = sets_lost + (not p_won)::integer,
      rounds_won = p_rounds_won,
      updated_at = clock_timestamp(),
      finished_at = case when p_rounds_won is null then null else clock_timestamp() end
  where day = p_day and user_id = p_user_id;
  return 'added';
end;
$$;

revoke execute on function public.challenge_add_set(date, uuid, integer, boolean, smallint)
  from public, anon, authenticated;
grant execute on function public.challenge_add_set(date, uuid, integer, boolean, smallint) to service_role;

-- A day's board: finished runs by accounts, most rounds won first, then
-- fewest sets lost. Ties share a rank; whoever finished first is listed
-- first. The top 100 plus the viewer's own run; public columns only.
create function public.challenge_leaderboard(p_day date)
returns table (
  rank bigint,
  entries bigint,
  handle text,
  avatar_url text,
  rounds_won smallint,
  sets_won integer,
  sets_lost smallint,
  finished_at timestamptz,
  is_viewer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      rank() over (order by c.rounds_won desc, c.sets_lost) as rank,
      row_number() over (order by c.rounds_won desc, c.sets_lost, c.finished_at, c.user_id) as pos,
      count(*) over () as entries,
      p.handle,
      p.avatar_url,
      c.rounds_won,
      cardinality(c.sets) - c.sets_lost as sets_won,
      c.sets_lost,
      c.finished_at,
      coalesce(c.user_id = (select auth.uid()), false) as is_viewer
    from public.challenge_runs c
    join public.profiles p on p.user_id = c.user_id
    where c.day = p_day and c.rounds_won is not null
  )
  select rank, entries, handle, avatar_url, rounds_won, sets_won, sets_lost, finished_at, is_viewer
  from ranked
  where pos <= 100 or is_viewer
  order by pos;
$$;

revoke execute on function public.challenge_leaderboard(date) from public;
grant execute on function public.challenge_leaderboard(date) to anon, authenticated, service_role;

-- Same as before, plus the guest's challenge runs move to the new account
-- with their rolls.
create or replace function public.create_profile_and_claim(
  p_user_id uuid,
  p_handle text,
  p_avatar_url text,
  p_guest_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, handle, avatar_url)
  values (p_user_id, p_handle, p_avatar_url)
  on conflict (user_id) do nothing;

  if not found then
    return false;
  end if;

  if p_guest_id is not null and p_guest_id <> p_user_id then
    update public.rolls
    set user_id = p_user_id
    where user_id = p_guest_id
      and exists (select 1 from auth.users u where u.id = p_guest_id and u.is_anonymous)
      and day not in (select r.day from public.rolls r where r.user_id = p_user_id);

    update public.challenge_runs
    set user_id = p_user_id
    where user_id = p_guest_id
      and exists (select 1 from auth.users u where u.id = p_guest_id and u.is_anonymous)
      and day not in (select c.day from public.challenge_runs c where c.user_id = p_user_id);
  end if;

  update public.profiles p
  set total_score = coalesce(t.total_score, 0), roll_count = coalesce(t.roll_count, 0)
  from (
    select sum(score)::bigint as total_score, count(*)::integer as roll_count
    from public.rolls
    where user_id = p_user_id
  ) t
  where p.user_id = p_user_id;

  return true;
end;
$$;

-- Guest cleanup: playing the challenge counts as activity, like rolling and
-- playing a season.
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
      and not exists (
        select 1 from public.challenge_runs c
        where c.user_id = u.id and c.updated_at >= now() - make_interval(days => p_days)
      )
    returning 1
  )
  select count(*)::integer from deleted;
$$;
