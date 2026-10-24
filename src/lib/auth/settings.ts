import { cacheLife } from "next/cache";

import { supabasePublishableKey, supabaseUrl } from "../supabase/env";
import { OAUTH_PROVIDERS, type OAuthProvider } from "./providers";

export interface AuthSettings {
  /** Anonymous sign-ins are enabled, so visitors can roll as guests. */
  guests: boolean;
  /** OAuth providers enabled in the Supabase project, in display order. */
  providers: OAuthProvider[];
}

/**
 * Which sign-in methods the Supabase project has switched on, so the UI only
 * offers ones that work. Public data from the Auth settings endpoint.
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  "use cache";
  cacheLife("minutes");

  const res = await fetch(`${supabaseUrl()}/auth/v1/settings`, {
    headers: { apikey: supabasePublishableKey() },
  });
  if (!res.ok) throw new Error(`Auth settings request failed (${res.status})`);
  const { external = {} } = (await res.json()) as { external?: Record<string, boolean> };
  return {
    guests: external.anonymous_users === true,
    providers: OAUTH_PROVIDERS.filter((p) => external[p] === true),
  };
}
