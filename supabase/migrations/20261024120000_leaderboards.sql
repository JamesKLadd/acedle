-- Acedle schema, milestone 3: leaderboards and profile totals.
--
-- Leaderboards only include accounts (users with a profile). They're read
-- through the functions below, which return public columns only (handle,
-- player, score), so clients still can't read other users' rolls directly.

-- ---------------------------------------------------------------------------
-- Running totals per account, for the all-time board and profile header.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column total_score bigint not null default 0,
  add column roll_count integer not null default 0;

create function public.rolls_sync_profile_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.profiles
    set total_score = total_score - old.score, roll_count = roll_count - 1
    where user_id = old.user_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.profiles
    set total_score = total_score + new.score, roll_count = roll_count + 1
    where user_id = new.user_id;
  end if;
  return null;
end;
$$;

revoke execute on function public.rolls_sync_profile_totals() from public, anon, authenticated;

create trigger rolls_sync_profile_totals
after insert or delete or update of user_id, score on public.rolls
for each row execute function public.rolls_sync_profile_totals();

-- Backfill accounts that already have rolls.
update public.profiles p
set total_score = t.total_score, roll_count = t.roll_count
from (
  select user_id, sum(score)::bigint as total_score, count(*)::integer as roll_count
  from public.rolls
  group by user_id
) t
where t.user_id = p.user_id;

create index profiles_total_score_idx on public.profiles (total_score desc) where roll_count > 0;

-- Same as before, plus a recount of the totals at the end, so they're right
-- even if the account somehow rolled before its profile existed.
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

-- ---------------------------------------------------------------------------
-- Leaderboards. Each returns the top 100 plus the viewer's own entries when
-- they're further down. Ties share a rank; earlier entries are listed first.
-- ---------------------------------------------------------------------------

-- Rolls between two UTC days: the daily board (from = to) and the weekly board
-- (Monday to Sunday). Ranges longer than a week return nothing.
create function public.roll_leaderboard(p_from date, p_to date)
returns table (
  rank bigint,
  entries bigint,
  day date,
  handle text,
  avatar_url text,
  year smallint,
  player_id integer,
  player_name text,
  final_rank smallint,
  score bigint,
  is_viewer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      rank() over (order by r.score desc) as rank,
      row_number() over (order by r.score desc, r.created_at, r.id) as pos,
      count(*) over () as entries,
      r.day,
      p.handle,
      p.avatar_url,
      r.year,
      r.player_id,
      r.season_snapshot ->> 'name' as player_name,
      (r.season_snapshot -> 'ranking' ->> 'final')::smallint as final_rank,
      r.score,
      coalesce(r.user_id = (select auth.uid()), false) as is_viewer
    from public.rolls r
    join public.profiles p on p.user_id = r.user_id
    where r.day between p_from and p_to
      and p_to - p_from between 0 and 6
  )
  select rank, entries, day, handle, avatar_url, year, player_id, player_name, final_rank, score, is_viewer
  from ranked
  where pos <= 100 or is_viewer
  order by pos;
$$;

-- Accounts by total points over all their rolls.
create function public.alltime_leaderboard()
returns table (
  rank bigint,
  entries bigint,
  handle text,
  avatar_url text,
  total_score bigint,
  roll_count integer,
  is_viewer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      rank() over (order by p.total_score desc) as rank,
      row_number() over (order by p.total_score desc, p.created_at, p.user_id) as pos,
      count(*) over () as entries,
      p.handle,
      p.avatar_url,
      p.total_score,
      p.roll_count,
      coalesce(p.user_id = (select auth.uid()), false) as is_viewer
    from public.profiles p
    where p.roll_count > 0
  )
  select rank, entries, handle, avatar_url, total_score, roll_count, is_viewer
  from ranked
  where pos <= 100 or is_viewer
  order by pos;
$$;

revoke execute on function public.roll_leaderboard(date, date), public.alltime_leaderboard() from public;
grant execute on function public.roll_leaderboard(date, date), public.alltime_leaderboard()
  to anon, authenticated, service_role;
