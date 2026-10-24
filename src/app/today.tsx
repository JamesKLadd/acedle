import { connection } from "next/server";

import { RollCard } from "@/components/roll-card";
import type { OAuthProvider } from "@/lib/auth/providers";
import { getAuthSettings, type AuthSettings } from "@/lib/auth/settings";
import type { SignInNotice } from "@/lib/auth/sign-in";
import { toDailyRoll, utcDay } from "@/lib/roll/daily";
import { supabaseRollStore } from "@/lib/roll/store";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { RollButton } from "./roll-button";
import { SignInButtons } from "./sign-in-buttons";

const NOTICES: Record<SignInNotice, string> = {
  claimed: "Welcome to Acedle! Your guest rolls are now saved to your account.",
  "guest-rolls-dropped":
    "Welcome back! This account already existed, so the rolls you made as a guest on this device weren't added to it.",
};

/** If the settings can't be read, offer guest play and let any error surface when rolling. */
const FALLBACK_SETTINGS: AuthSettings = { guests: true, providers: [] };

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

/** Today's roll (or the button to make it) and the account status. Reads the session. */
export async function Today({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) {
    return (
      <p className="text-zinc-500">
        Daily rolls need Supabase. Copy <code>.env.example</code> to <code>.env.local</code> and fill it in.
      </p>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  const isAccount = Boolean(claims && !claims.is_anonymous);
  // "Today" depends on the clock, so this can't be part of a prefetch.
  await connection();
  const day = utcDay();

  const [settings, row, profile, params] = await Promise.all([
    getAuthSettings().catch((e) => {
      console.error(e);
      return FALLBACK_SETTINGS;
    }),
    claims ? supabaseRollStore(supabase).find(claims.sub, day) : null,
    claims && isAccount ? supabase.from("profiles").select("handle").eq("user_id", claims.sub).maybeSingle() : null,
    searchParams,
  ]);
  const roll = row && toDailyRoll(row);
  const notice =
    typeof params.notice === "string" && Object.hasOwn(NOTICES, params.notice) ? (params.notice as SignInNotice) : null;

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p className="rounded-lg bg-lime-50 p-3 text-sm text-lime-900 dark:bg-lime-950 dark:text-lime-200">
          {NOTICES[notice]}
        </p>
      )}

      {roll ? (
        <div>
          <h2 className="mb-3 text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Today&apos;s roll · {fmtDay(day)}
          </h2>
          <RollCard season={roll.season} score={roll.score} />
          <p className="mt-3 text-sm text-zinc-500">Your next roll unlocks at midnight UTC.</p>
        </div>
      ) : claims || settings.guests ? (
        <RollButton />
      ) : settings.providers.length > 0 ? (
        <p>Sign in to roll today&apos;s season.</p>
      ) : (
        <p className="text-zinc-500">
          Daily rolls aren&apos;t open yet: turn on anonymous sign-ins or an OAuth provider in Supabase.
        </p>
      )}

      {isAccount ? (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <span>
            Signed in as <strong className="text-foreground">{profile?.data?.handle ?? "player"}</strong>
          </span>
          <form action={signOut}>
            <button className="underline underline-offset-4 hover:text-foreground">Sign out</button>
          </form>
        </div>
      ) : (
        <SignInPrompt providers={settings.providers} guest={Boolean(claims)} />
      )}
    </div>
  );
}

function SignInPrompt({ providers, guest }: { providers: readonly OAuthProvider[]; guest: boolean }) {
  if (providers.length === 0) return null;
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {guest ? "You're playing as a guest. " : ""}
        Sign in to save your rolls and appear on the leaderboards. A new account keeps the rolls you made as a guest.
      </p>
      <SignInButtons providers={providers} />
    </div>
  );
}

export function TodaySkeleton() {
  return <div className="h-16 w-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />;
}
