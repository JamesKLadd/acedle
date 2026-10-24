import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { serviceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role client: bypasses RLS. Only for trusted server code that has
 * already checked who the user is (writing rolls, claiming guest rolls).
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
