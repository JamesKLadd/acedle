import "server-only";

import { cache } from "react";

import { createAdminClient } from "../supabase/admin";
import { toDailyRoll, type DailyRoll } from "./daily";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SharedRoll {
  roll: DailyRoll;
  /** Server-side only: to tell the owner apart from other viewers. Never render it. */
  ownerId: string;
  /** Null for guests. */
  handle: string | null;
}

/**
 * Any roll by id, for share links and their preview images. Roll ids are
 * random UUIDs that only appear in links people share, so a roll page works
 * like an unlisted link. Reads with the service role (rolls are otherwise
 * private), so callers must only show public fields.
 */
export const getSharedRoll = cache(async (id: string): Promise<SharedRoll | null> => {
  if (!UUID.test(id)) return null;
  const db = createAdminClient();
  const { data: row, error } = await db.from("rolls").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Couldn't load the roll: ${error.message}`);
  if (!row) return null;
  const { data: profile } = await db.from("profiles").select("handle").eq("user_id", row.user_id).maybeSingle();
  return { roll: toDailyRoll(row), ownerId: row.user_id, handle: profile?.handle ?? null };
});
