import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import { createClient } from "../supabase/server";

export type Viewer = Awaited<ReturnType<typeof getViewer>>;

/**
 * Who is looking at the page (verified), and a Supabase client acting as them
 * (RLS applies). Request-time only: checking the session reads the clock, so it
 * can't be prerendered or prefetched. Shared by everything in one request.
 */
export const getViewer = cache(async () => {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  return {
    supabase,
    userId: claims?.sub ?? null,
    /** Signed in anonymously: rolls count, but not on leaderboards. */
    isGuest: Boolean(claims?.is_anonymous),
    /** Signed in with OAuth (has a profile). */
    isAccount: Boolean(claims && !claims.is_anonymous),
  };
});
