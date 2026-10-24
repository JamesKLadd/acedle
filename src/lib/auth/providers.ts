/** OAuth providers Acedle supports, in display order. Each must also be enabled in Supabase. */
export const OAUTH_PROVIDERS = ["google", "discord", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  discord: "Discord",
  github: "GitHub",
};
