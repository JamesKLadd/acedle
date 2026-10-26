import { Flame, Timer, Trophy } from "lucide-react";
import Link from "next/link";

import { NextRollCountdown, RememberRoll } from "@/components/countdown";
import { NewMedals } from "@/components/goals";
import { RollCard } from "@/components/roll-card";
import { SeasonLink } from "@/components/season/season-link";
import { ShareButton } from "@/components/share-button";
import { TotalScore } from "@/components/total-score";
import { TournamentLink } from "@/components/tournament/tournament-link";
import { Avatar } from "@/components/board";
import { buttonClass, Chip, Eyebrow } from "@/components/ui";
import type { OAuthProvider } from "@/lib/auth/providers";
import { getAuthSettings, type AuthSettings } from "@/lib/auth/settings";
import type { SignInNotice } from "@/lib/auth/sign-in";
import { getViewer } from "@/lib/auth/viewer";
import { fmtShortDay } from "@/lib/format";
import { getRollBoard } from "@/lib/leaderboard";
import { medalsFromCard } from "@/lib/profile/goals";
import { getMyRolls, getMySeasons } from "@/lib/profile/queries";
import { getSeasonPhoto } from "@/lib/season-photo";
import { toDailyRoll, utcDay } from "@/lib/roll/daily";
import { supabaseRollStore } from "@/lib/roll/store";
import { topPercent } from "@/lib/scoring/distribution";
import { shareText } from "@/lib/share";
import { currentStreak } from "@/lib/streak";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTournament, runResult } from "@/lib/tournament-store";

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

/** Today's roll (or the button to make it) and the account status. Reads the session. */
export async function Today({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) {
    return (
      <p className="text-muted">
        Daily rolls need Supabase. Copy <code>.env.example</code> to <code>.env.local</code> and fill it in.
      </p>
    );
  }

  const { supabase, userId, isAccount } = await getViewer();
  const day = utcDay();

  const [settings, row, profile, board, params, recent] = await Promise.all([
    getAuthSettings().catch((e) => {
      console.error(e);
      return FALLBACK_SETTINGS;
    }),
    userId ? supabaseRollStore(supabase).find(userId, day) : null,
    userId && isAccount
      ? supabase
          .from("profiles")
          .select("handle, avatar_url, total_score, roll_count")
          .eq("user_id", userId)
          .maybeSingle()
      : null,
    // The rank line is a bonus: don't fail the page over it.
    isAccount
      ? getRollBoard(supabase, day, day).catch((e) => {
          console.error(e);
          return null;
        })
      : null,
    searchParams,
    // Recent rolls, for the streak (and a guest's total).
    userId
      ? supabase
          .from("rolls")
          .select("day, score")
          .eq("user_id", userId)
          .order("day", { ascending: false })
          .limit(400)
          .then(({ data }) => data ?? [])
      : [],
  ]);
  const days = recent.map((r) => r.day);
  const streak = currentStreak(days, day);
  // Accounts keep a running total; guests' rolls are few enough to add up.
  const total = profile?.data?.total_score ?? recent.reduce((sum, r) => sum + r.score, 0);
  const rollCount = profile?.data?.roll_count ?? recent.length;
  const roll = row && toDailyRoll(row);
  const [tournament, medals] = roll ? await Promise.all([getTournament(roll.id), newMedalsFrom(roll.id)]) : [null, []];
  const top = roll ? topPercent(roll.score.total) : 100;
  const mine = board?.find((e) => e.is_viewer);
  const notice =
    typeof params.notice === "string" && Object.hasOwn(NOTICES, params.notice) ? (params.notice as SignInNotice) : null;

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p className="rounded-lg bg-accent-soft p-3 text-sm text-fg">
          {NOTICES[notice]}
        </p>
      )}

      {roll ? (
        <div>
          <RememberRoll day={roll.day} />
          <div className="mb-4">
            <TotalScore total={total} rolls={rollCount} />
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Eyebrow>Today&apos;s roll · {fmtShortDay(day)}</Eyebrow>
            <StreakChip streak={streak} />
          </div>
          <RollCard
            season={roll.season}
            score={roll.score}
            topPercent={top}
            photo={await getSeasonPhoto(roll.season.playerId, roll.season.year)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ShareButton
              text={shareText({ ...roll, topPercent: top, tournament: runResult(tournament) })}
              path={`/rolls/${roll.id}`}
            />
            {mine && (
              <Link href="/leaderboard" className={buttonClass({ variant: "secondary" })}>
                <Trophy className="size-4" aria-hidden />#{mine.rank} of {mine.entries} today
              </Link>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <NewMedals medals={medals} />
            <TournamentLink rollId={roll.id} tournament={tournament} isOwner />
            <SeasonLink rollId={roll.id} ownerId={userId!} isOwner />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md border-2 border-line bg-surface shadow-[3px_3px_0_0_var(--line)] px-4 py-3 text-sm text-muted">
            <Timer className="size-4 shrink-0 text-accent-text" aria-hidden />
            <NextRollCountdown />
          </div>
        </div>
      ) : userId || settings.guests ? (
        <RollButton total={total} rolls={rollCount}>
          {streak > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <StreakChip streak={streak} /> Roll today to keep it going.
            </p>
          )}
        </RollButton>
      ) : settings.providers.length > 0 ? (
        <p>Sign in to roll today&apos;s season.</p>
      ) : (
        <p className="text-muted">
          Daily rolls aren&apos;t open yet: turn on anonymous sign-ins or an OAuth provider in Supabase.
        </p>
      )}

      {isAccount ? (
        <div className="flex items-center gap-3 text-sm text-muted">
          <Avatar src={profile?.data?.avatar_url} name={profile?.data?.handle ?? "player"} size={28} />
          <span>
            Signed in as <strong className="text-fg">{profile?.data?.handle ?? "player"}</strong>
          </span>
          <form action={signOut} className="ml-auto">
            <button className={buttonClass({ variant: "ghost", size: "sm" })}>Sign out</button>
          </form>
        </div>
      ) : (
        <SignInPrompt providers={settings.providers} guest={Boolean(userId)} />
      )}
    </div>
  );
}

/** Goal medals today's card brought. A bonus: if they can't be worked out, there are none to show. */
async function newMedalsFrom(rollId: string) {
  try {
    const [rolls, seasons] = await Promise.all([getMyRolls(), getMySeasons()]);
    return medalsFromCard(rollId, rolls, seasons);
  } catch (e) {
    console.error(e);
    return [];
  }
}

function StreakChip({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <Chip className="shrink-0 bg-cat-surface/15 whitespace-nowrap text-cat-surface">
      <Flame className="size-3.5" aria-hidden />
      {streak}-day streak
    </Chip>
  );
}

function SignInPrompt({ providers, guest }: { providers: readonly OAuthProvider[]; guest: boolean }) {
  if (providers.length === 0) return null;
  return (
    <div className="rounded-lg border-2 border-line bg-surface shadow-[4px_4px_0_0_var(--line)] p-5">
      <p className="font-display text-lg font-bold tracking-wide uppercase">
        {guest ? "You're playing as a guest" : "Keep your rolls"}
      </p>
      <p className="mt-1 mb-4 text-sm text-muted">
        Sign in to save your rolls and appear on the leaderboards. A new account keeps the rolls you made as a guest.
      </p>
      <SignInButtons providers={providers} />
    </div>
  );
}

export function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <div className="h-14 w-72 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
    </div>
  );
}
