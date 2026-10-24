-- Acedle schema, milestone 2: player data, profiles and daily rolls.
--
-- Writes go through the server with the service-role key: the scoring engine
-- runs in TypeScript, so clients never insert rolls themselves. Clients only
-- get read access, filtered by row-level security.

-- ---------------------------------------------------------------------------
-- Player data (loaded from data/seasons by `npm run db:seed`)
-- ---------------------------------------------------------------------------

create table public.players (
  -- Sackmann player id.
  id integer primary key,
  name text not null,
  -- IOC country code.
  country text not null,
  hand text not null check (hand in ('R', 'L', 'U', 'A')),
  height_cm smallint
);

create table public.player_seasons (
  year smallint not null,
  player_id integer not null references public.players (id),
  final_rank smallint not null,
  -- The full PlayerSeason record (src/lib/data/types.ts).
  stats jsonb not null,
  data_as_of date not null,
  primary key (year, player_id)
);

create index player_seasons_player_id_idx on public.player_seasons (player_id);

-- ---------------------------------------------------------------------------
-- Accounts. Only linked (non-guest) accounts get a profile, so joining on
-- profiles keeps guests off the leaderboards.
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null check (char_length(handle) between 1 and 32),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rolls. One per user per UTC day. A roll is frozen when it is made: it keeps
-- the stats it was scored from and the scoring version that scored it.
-- ---------------------------------------------------------------------------

create table public.rolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- UTC day of the roll.
  day date not null,
  -- Monday of the roll's week (weeks run Monday to Sunday, UTC).
  week date generated always as (date_trunc('week', day::timestamp)::date) stored,
  year smallint not null,
  player_id integer not null references public.players (id),
  season_snapshot jsonb not null,
  badges jsonb not null,
  base integer not null,
  mult double precision not null,
  score bigint not null,
  scoring_version smallint not null,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index rolls_day_score_idx on public.rolls (day, score desc);
create index rolls_week_score_idx on public.rolls (week, score desc);
create index rolls_player_id_idx on public.rolls (player_id);

-- Badge collection: one row per badge a user has earned, over all their rolls.
create view public.user_badges
with (security_invoker = true) as
select
  r.user_id,
  b.badge ->> 'id' as badge_id,
  count(*) as times_earned,
  min(r.day) as first_day,
  max(r.day) as last_day
from public.rolls r
cross join lateral jsonb_array_elements(r.badges) as b (badge)
group by r.user_id, b.badge ->> 'id';

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.player_seasons enable row level security;
alter table public.profiles enable row level security;
alter table public.rolls enable row level security;

create policy "Players are public" on public.players
  for select to anon, authenticated using (true);

create policy "Player seasons are public" on public.player_seasons
  for select to anon, authenticated using (true);

create policy "Profiles are public" on public.profiles
  for select to anon, authenticated using (true);

create policy "Users can read their own rolls" on public.rolls
  for select to authenticated using ((select auth.uid()) = user_id);

-- Supabase grants everything to anon/authenticated by default and relies on
-- RLS alone. Narrow the grants too, so a missing policy can't open up writes.
revoke all on public.players, public.player_seasons, public.profiles, public.rolls, public.user_badges
  from anon, authenticated;
grant select on public.players, public.player_seasons, public.profiles to anon, authenticated;
grant select on public.rolls, public.user_badges to authenticated;
grant select, insert, update, delete on public.players, public.player_seasons, public.profiles, public.rolls
  to service_role;
grant select on public.user_badges to service_role;

-- ---------------------------------------------------------------------------
-- First sign-in: create the profile and claim the guest's rolls.
--
-- Called by the OAuth callback after the code exchange. If the account already
-- has a profile, nothing changes and the result is false: an existing account
-- keeps its own rolls, otherwise someone could roll as several guests and
-- claim the best one. For a new account, the profile is created and the guest's
-- rolls move over (skipping any day the account already rolled).
-- ---------------------------------------------------------------------------

create function public.create_profile_and_claim(
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
  end if;

  return true;
end;
$$;

revoke execute on function public.create_profile_and_claim(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_profile_and_claim(uuid, text, text, uuid) to service_role;
