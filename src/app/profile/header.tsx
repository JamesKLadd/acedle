import { Award, BarChart3, Dices, Flame, Trophy } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/board";
import { Chip, linkClass, Stat } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { fmtDate, fmtScore } from "@/lib/format";
import { getAllTimeBoard } from "@/lib/leaderboard";
import { summarizeRolls } from "@/lib/profile/collection";
import { getMyProfile, getMyRolls } from "@/lib/profile/queries";
import { utcDay } from "@/lib/roll/daily";
import { bestStreak, currentStreak } from "@/lib/streak";

/** Avatar, name, streak and headline stats for the viewer (account or guest). */
export async function ProfileHeader() {
  const viewer = await getViewer();
  const [profile, rolls, board] = await Promise.all([
    getMyProfile(),
    getMyRolls(),
    viewer.isAccount ? getAllTimeBoard(viewer.supabase) : null,
  ]);
  const { count, total, best } = summarizeRolls(rolls);
  const rank = board?.find((e) => e.is_viewer);
  const days = rolls.map((r) => r.day);
  const streak = currentStreak(days, utcDay());
  const name = profile?.handle ?? (viewer.isGuest ? "Guest" : "Your profile");

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar src={profile?.avatar_url} name={name} size={64} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-4xl font-bold tracking-tight uppercase">{name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {profile ? (
              <span>Joined {fmtDate(profile.created_at.slice(0, 10))}</span>
            ) : viewer.isGuest ? (
              <span>
                Playing as a guest ·{" "}
                <Link href="/" className={linkClass}>
                  Sign in
                </Link>{" "}
                to keep these rolls
              </span>
            ) : (
              <span>
                <Link href="/" className={linkClass}>
                  Roll today&apos;s season
                </Link>{" "}
                to start your collection
              </span>
            )}
            {count > 0 && (
              <Chip className={streak > 0 ? "bg-cat-surface/15 text-cat-surface" : "bg-surface-2 text-muted"}>
                <Flame className="size-3.5" aria-hidden />
                {streak}-day streak · best {bestStreak(days)}
              </Chip>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Dices} label="Rolls" value={String(count)} />
        <Stat icon={BarChart3} label="Total points" value={fmtScore(total)} />
        <Stat icon={Award} label="Best roll" value={best ? fmtScore(best.score) : "–"} />
        <Stat icon={Trophy} label="All-time rank" value={rank ? `#${rank.rank}` : "–"} />
      </dl>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div aria-busy>
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-surface-2" />
        <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-2" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
