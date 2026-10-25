-- Acedle: tournament mode. After a daily roll, the player can take the rolled
-- player-season into a 16-player draw (src/lib/tournament.ts). One tournament
-- per roll. It's for bragging rights only: scores and leaderboards don't
-- change.
--
-- The draw, its seed and the player's set results are enough to replay the
-- whole tournament, so that's all that's stored. Sets are appended one at a
-- time by the server (tournament_add_set), so a lost set can't be replayed.

create table public.tournaments (
  roll_id uuid primary key references public.rolls (id) on delete cascade,
  -- 16 entrants in draw order: {playerId, year, name, country, finalRank, score, seed}.
  entrants jsonb not null check (jsonb_array_length(entrants) = 16),
  -- Index of the rolled player in entrants.
  you smallint not null check (you between 0 and 15),
  -- Decides the matches the player doesn't play (unsigned 32-bit).
  seed bigint not null check (seed between 0 and 4294967295),
  -- The player's sets so far, in order (true = won).
  sets boolean[] not null default '{}',
  -- Rounds won once the run is over: 0 = out in the round of 16 … 4 = champion.
  rounds_won smallint check (rounds_won between 0 and 4),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.tournaments enable row level security;

-- Readable by whoever owns the roll (so it follows the roll when a guest's
-- rolls move to their new account).
create policy "Users can read their own tournaments" on public.tournaments
  for select to authenticated
  using (exists (select 1 from public.rolls r where r.id = roll_id and r.user_id = (select auth.uid())));

revoke all on public.tournaments from anon, authenticated;
grant select on public.tournaments to authenticated;
grant select, insert, update, delete on public.tournaments to service_role;

-- Appends one set if the tournament still has `p_expected` sets and isn't
-- over, so two tabs can't both record the same set. `p_rounds_won` is the
-- result once this set ends the run (the server works it out), else null.
create function public.tournament_add_set(
  p_roll_id uuid,
  p_expected integer,
  p_won boolean,
  p_rounds_won smallint default null
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.tournaments
    set sets = sets || p_won,
        rounds_won = p_rounds_won,
        finished_at = case when p_rounds_won is null then null else now() end
    where roll_id = p_roll_id
      and cardinality(sets) = p_expected
      and rounds_won is null
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke execute on function public.tournament_add_set(uuid, integer, boolean, smallint)
  from public, anon, authenticated;
grant execute on function public.tournament_add_set(uuid, integer, boolean, smallint) to service_role;
