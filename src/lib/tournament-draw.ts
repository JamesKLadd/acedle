import "server-only";

import { loadSeasons } from "./data/seasons";
import type { PlayerSeason } from "./data/types";
import { rollSeason, type Rng } from "./roll";
import { scoreSeason } from "./scoring";
import { DRAW_SIZE, seedDraw, type Entrant, type TournamentSetup } from "./tournament";

const entrantOf = (s: PlayerSeason, score: number): Omit<Entrant, "seed"> => ({
  playerId: s.playerId,
  year: s.year,
  name: s.name,
  country: s.country,
  finalRank: s.ranking.final,
  score,
});

/**
 * A draw for the rolled `season` (which scored `score`): 15 other
 * player-seasons, rolled like the daily roll (any year, any of its top 100),
 * then seeded by score.
 */
export function drawTournament(season: PlayerSeason, score: number, rng: Rng = Math.random): TournamentSetup {
  const pools = loadSeasons();
  const taken = new Set([`${season.year}:${season.playerId}`]);
  const pool = [entrantOf(season, score)];
  while (pool.length < DRAW_SIZE) {
    const s = rollSeason(pools, { rng });
    const key = `${s.year}:${s.playerId}`;
    if (taken.has(key)) continue;
    taken.add(key);
    pool.push(entrantOf(s, scoreSeason(s).total));
  }
  return seedDraw(pool, 0, Math.floor(rng() * 2 ** 32));
}
