import "server-only";

import { cache } from "react";

import { createAdminClient } from "./supabase/admin";

/** Whether the user can review photo suggestions (listed in public.admins). */
export const isAdmin = cache(async (userId: string | null): Promise<boolean> => {
  if (!userId) return false;
  const { data, error } = await createAdminClient().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) console.error(`Couldn't check admins: ${error.message}`);
  return Boolean(data);
});
