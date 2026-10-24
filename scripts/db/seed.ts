// Loads players and player-seasons from data/seasons into Supabase. Safe to
// re-run: rows are upserted, and seasons that dropped out of a year's top 100
// (the live year changes as rankings update) are removed. Players are never
// deleted, since rolls reference them.
//
//   npm run db:seed
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from the
// environment or .env.local), and the schema from supabase/migrations.

import { createClient } from "@supabase/supabase-js";

import { loadSeasons } from "../../src/lib/data/seasons";
import type { Database } from "../../src/lib/supabase/database.types";
import { chunks, playerRows, playerSeasonRow } from "./rows";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the environment.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const pools = loadSeasons();

async function check<T extends { error: { message: string } | null }>(what: string, request: PromiseLike<T>) {
  const { error } = await request;
  if (error) throw new Error(`${what}: ${error.message}`);
}

async function main() {
  const players = playerRows([...pools.values()].flat());
  for (const batch of chunks(players, 500)) {
    await check("players", db.from("players").upsert(batch));
  }
  console.log(`players: ${players.length}`);

  let seasonCount = 0;
  for (const [year, pool] of pools) {
    for (const batch of chunks(pool.map(playerSeasonRow), 100)) {
      await check(`player_seasons ${year}`, db.from("player_seasons").upsert(batch));
    }
    const ids = pool.map((s) => s.playerId).join(",");
    await check(
      `prune ${year}`,
      db.from("player_seasons").delete().eq("year", year).not("player_id", "in", `(${ids})`),
    );
    seasonCount += pool.length;
  }
  console.log(`player_seasons: ${seasonCount} (${pools.size} years)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
