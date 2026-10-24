import type { PlayerSeason } from "../../src/lib/data/types";
import type { TablesInsert } from "../../src/lib/supabase/database.types";

/** 20151228 → "2015-12-28" */
export function ymdToIso(ymd: number): string {
  const s = String(ymd);
  if (!/^\d{8}$/.test(s)) throw new Error(`Bad YYYYMMDD date: ${ymd}`);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

/** One row per player, with details from their most recent season. */
export function playerRows(seasons: Iterable<PlayerSeason>): TablesInsert<"players">[] {
  const latest = new Map<number, PlayerSeason>();
  for (const s of seasons) {
    const seen = latest.get(s.playerId);
    if (!seen || s.year > seen.year) latest.set(s.playerId, s);
  }
  return [...latest.values()]
    .sort((a, b) => a.playerId - b.playerId)
    .map((s) => ({ id: s.playerId, name: s.name, country: s.country, hand: s.hand, height_cm: s.heightCm }));
}

export function playerSeasonRow(s: PlayerSeason): TablesInsert<"player_seasons"> {
  return {
    year: s.year,
    player_id: s.playerId,
    final_rank: s.ranking.final,
    stats: s,
    data_as_of: ymdToIso(s.dataAsOf),
  };
}

export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
