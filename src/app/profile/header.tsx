import Link from "next/link";

import { getViewer } from "@/lib/auth/viewer";
import { fmtDate, fmtScore } from "@/lib/format";
import { getAllTimeBoard } from "@/lib/leaderboard";
import { summarizeRolls } from "@/lib/profile/collection";
import { getMyProfile, getMyRolls } from "@/lib/profile/queries";

const linkClass = "font-medium text-lime-600 underline underline-offset-4 dark:text-lime-400";

/** Name and headline stats for the viewer (account or guest). */
export async function ProfileHeader() {
  const viewer = await getViewer();
  const [profile, rolls, board] = await Promise.all([
    getMyProfile(),
    getMyRolls(),
    viewer.isAccount ? getAllTimeBoard(viewer.supabase) : null,
  ]);
  const { count, total, best } = summarizeRolls(rolls);
  const rank = board?.find((e) => e.is_viewer);

  return (
    <div>
      <h1 className="text-3xl font-bold">{profile?.handle ?? (viewer.isGuest ? "Guest" : "Your profile")}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {profile ? (
          `Joined ${fmtDate(profile.created_at.slice(0, 10))}`
        ) : viewer.isGuest ? (
          <>
            You&apos;re playing as a guest.{" "}
            <Link href="/" className={linkClass}>
              Sign in
            </Link>{" "}
            to keep these rolls and join the leaderboards.
          </>
        ) : (
          <>
            <Link href="/" className={linkClass}>
              Roll today&apos;s season
            </Link>{" "}
            to start your collection.
          </>
        )}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rolls" value={String(count)} />
        <Stat label="Total points" value={fmtScore(total)} />
        <Stat label="Best roll" value={best ? fmtScore(best.score) : "–"} />
        <Stat label="All-time rank" value={rank ? `#${rank.rank}` : "–"} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500 uppercase">{label}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div aria-busy>
      <div className="h-9 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
