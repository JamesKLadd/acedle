import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import type { RollStore } from "./daily";

/** Postgres unique_violation: the user already has a roll that day. */
const UNIQUE_VIOLATION = "23505";

/**
 * Rolls in Supabase. Inserting needs the service-role client: clients have no
 * insert grant, so scores can only come from the server. Reads work with
 * either client (RLS limits a user to their own rolls).
 */
export function supabaseRollStore(db: SupabaseClient<Database>): RollStore {
  return {
    async find(userId, day) {
      const { data, error } = await db.from("rolls").select("*").eq("user_id", userId).eq("day", day).maybeSingle();
      if (error) throw new Error(`Couldn't load the roll for ${day}: ${error.message}`);
      return data;
    },
    async insert(row) {
      // The season data can gain players (the live season refreshes daily)
      // before the players table is reseeded; add the row so the FK holds.
      const s = row.season_snapshot;
      const { error: playerError } = await db
        .from("players")
        .upsert(
          { id: s.playerId, name: s.name, country: s.country, hand: s.hand, height_cm: s.heightCm },
          { ignoreDuplicates: true },
        );
      if (playerError) throw new Error(`Couldn't save the player for ${row.day}: ${playerError.message}`);

      const { data, error } = await db.from("rolls").insert(row).select().single();
      if (error?.code === UNIQUE_VIOLATION) return null;
      if (error) throw new Error(`Couldn't save the roll for ${row.day}: ${error.message}`);
      return data;
    },
  };
}
