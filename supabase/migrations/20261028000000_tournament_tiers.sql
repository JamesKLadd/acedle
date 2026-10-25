-- Acedle: tournament tiers. A daily roll's tournament is now a 250, 500,
-- 1000 or Grand Slam (src/lib/tournament.ts, TIERS); the Grand Slam's draw
-- has 32 players and 5 rounds. Runs from before tiers keep a null tier.
--
-- Safe to apply before the code that uses it: it only adds a column and
-- widens the checks.

alter table public.tournaments add column tier text check (tier in ('250', '500', '1000', 'slam'));

alter table public.tournaments drop constraint tournaments_entrants_check;
alter table public.tournaments drop constraint tournaments_you_check;
alter table public.tournaments drop constraint tournaments_rounds_won_check;

alter table public.tournaments
  add constraint tournaments_entrants_check check (jsonb_array_length(entrants) in (16, 32)),
  add constraint tournaments_you_check check (you >= 0 and you < jsonb_array_length(entrants)),
  -- Rounds won: 4 wins a 16-player draw, 5 a 32-player one.
  add constraint tournaments_rounds_won_check check (rounds_won between 0 and 5),
  -- Only Grand Slams have 32 players.
  add constraint tournaments_tier_size_check check ((tier = 'slam') = (jsonb_array_length(entrants) = 32));
