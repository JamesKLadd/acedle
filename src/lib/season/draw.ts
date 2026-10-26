import "server-only";

import { findSeason, loadSeasons } from "../data/seasons";
import type { PlayerSeason } from "../data/types";
import type { Rng } from "../roll";
import { scoreSeason } from "../scoring";
import { FORMAT, KNOCKOUTS } from "./calendar";
import { courtFactors } from "./odds";
import { RIVALS, type Rival, type SeasonSetup } from "./season";

/** The rival field's final ranks, inclusive. */
export const RIVAL_RANKS = [1, 50] as const;
/** How fast a Masters' pull fades down the field: the best-scoring rivals play most of them. */
const MASTERS_SPREAD = 12;

/** A player-season as a season entrant. Older rolls lack surface records, so they come from the data. */
export function toRival(season: PlayerSeason, score: number): Rival {
  const bySurface = season.matches.bySurface ?? findSeason(season.year, season.playerId)?.matches.bySurface;
  return {
    playerId: season.playerId,
    year: season.year,
    name: season.name,
    country: season.country,
    finalRank: season.ranking.final,
    score,
    courts: courtFactors(bySurface),
  };
}

let field: PlayerSeason[] | null = null;

/** Every player-season the rivals are drawn from. */
function rivalPool(): PlayerSeason[] {
  field ??= [...loadSeasons().values()]
    .flat()
    .filter((s) => s.ranking.final >= RIVAL_RANKS[0] && s.ranking.final <= RIVAL_RANKS[1]);
  return field;
}

/** `k` of `items` without repeats, each picked with chance proportional to its weight. */
function weightedSample(weights: readonly number[], k: number, rng: Rng): number[] {
  const left = weights.map((w, i) => ({ w, i }));
  const picked: number[] = [];
  while (picked.length < k && left.length > 0) {
    let x = rng() * left.reduce((n, e) => n + e.w, 0);
    let j = 0;
    while (j < left.length - 1 && x >= left[j].w) x -= left[j++].w;
    picked.push(left[j].i);
    left.splice(j, 1);
  }
  return picked;
}

/**
 * A new season for `card` (which scored `score`): 40 rivals from any year
 * ranked 1–50 (one season per player, never the card's player), the Slams'
 * entry lists (the 31 best by score) and the Masters' (15 each, the best
 * rivals most likely to play).
 */
export function drawSeason(card: PlayerSeason, score: number, rng: Rng = Math.random): SeasonSetup {
  const pool = rivalPool();
  const players = new Set([card.playerId]);
  const rivals: Rival[] = [];
  while (rivals.length < RIVALS) {
    const s = pool[Math.floor(rng() * pool.length)];
    if (players.has(s.playerId)) continue;
    players.add(s.playerId);
    rivals.push(toRival(s, scoreSeason(s).total));
  }
  // Best first, so entry lists read top-down.
  rivals.sort((a, b) => b.score - a.score);

  const byScore = rivals.map((_, i) => i);
  const weights = byScore.map((i) => Math.exp(-i / MASTERS_SPREAD));
  const entries = KNOCKOUTS.map((event) => {
    const others = FORMAT[event.kind as "slam" | "masters"].size - 1;
    const chosen = event.kind === "slam" ? byScore.slice(0, others) : weightedSample(weights, others, rng);
    return chosen.sort((a, b) => a - b);
  });

  return { you: toRival(card, score), rivals, entries, seed: Math.floor(rng() * 2 ** 32) };
}
