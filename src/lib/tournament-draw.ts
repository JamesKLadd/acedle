import "server-only";

import { loadSeasons } from "./data/seasons";
import type { PlayerSeason } from "./data/types";
import type { Rng } from "./roll";
import { scoreSeason } from "./scoring";
import { seedDraw, tierOf, type Entrant, type TierId, type TournamentSetup } from "./tournament";

const entrantOf = (s: PlayerSeason, score: number): Omit<Entrant, "seed"> => ({
  playerId: s.playerId,
  year: s.year,
  name: s.name,
  country: s.country,
  finalRank: s.ranking.final,
  score,
});

let all: PlayerSeason[] | null = null;

/** Every rollable player-season. */
function allSeasons(): PlayerSeason[] {
  all ??= [...loadSeasons().values()].flat();
  return all;
}

/**
 * A `tier` draw for the rolled `season` (which scored `score`): the other
 * entrants are random player-seasons from any year whose final rank is in
 * the tier's range, then everyone is seeded by score.
 */
export function drawTournament(
  season: PlayerSeason,
  score: number,
  tier: TierId,
  rng: Rng = Math.random,
): TournamentSetup {
  const { size, ranks } = tierOf(tier);
  const [lo, hi] = ranks;
  const field = allSeasons().filter(
    (s) => s.ranking.final >= lo && s.ranking.final <= hi && !(s.year === season.year && s.playerId === season.playerId),
  );
  const pool = [entrantOf(season, score)];
  const taken = new Set<number>();
  while (pool.length < size) {
    const i = Math.floor(rng() * field.length);
    if (taken.has(i)) continue;
    taken.add(i);
    pool.push(entrantOf(field[i], scoreSeason(field[i]).total));
  }
  return seedDraw(pool, 0, Math.floor(rng() * 2 ** 32), tier);
}
