import { CalendarRange, ChevronRight, Crown } from "lucide-react";
import Link from "next/link";

import { getActiveSeason, seasonsOfRoll, type StoredSeason } from "@/lib/season/store";

import { StartSeasonButton } from "./start-season";

const STATUS: Record<StoredSeason["status"], string> = {
  active: "In progress",
  finished: "Finished",
  abandoned: "Unfinished",
};

/** "31–2 · 7 titles · 12,450 pts" */
export const seasonLine = (s: Pick<StoredSeason, "wins" | "losses" | "titles" | "points">) =>
  `${s.wins}–${s.losses} · ${s.titles} ${s.titles === 1 ? "title" : "titles"} · ${s.points.toLocaleString("en-US")} pts`;

/**
 * A card's way into season mode: its latest season, a button to start one,
 * or (when the owner is mid-season with another card) a link to that one.
 * Shows nothing to other viewers of a card that has no season.
 */
export async function SeasonLink({ rollId, ownerId, isOwner }: { rollId: string; ownerId: string; isOwner: boolean }) {
  const [seasons, active] = await Promise.all([seasonsOfRoll(rollId), isOwner ? getActiveSeason(ownerId) : null]);
  const latest = seasons[0] ?? null;
  if (!latest && !isOwner) return null;

  const box =
    "flex items-center gap-4 rounded-lg border-2 border-line bg-surface px-5 py-4 shadow-[4px_4px_0_0_var(--line)]";

  if (latest) {
    const perfect = latest.status === "finished" && latest.losses === 0;
    return (
      <div className="flex flex-col gap-3">
        <Link href={`/seasons/${latest.id}`} className={`group ${box} transition hover:border-fg`}>
          {perfect ? (
            <Crown className="size-7 shrink-0 text-legendary" aria-hidden />
          ) : (
            <CalendarRange className="size-7 shrink-0 text-accent-text" aria-hidden />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              Season: {perfect ? "Perfect season" : STATUS[latest.status].toLowerCase()}
            </span>
            <span className="block text-sm text-muted">
              {latest.status === "active" && latest.sets.length === 0 ? "Ready for the Australian Open." : seasonLine(latest)}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
        {isOwner && !active && <StartSeasonButton rollId={rollId} label="Play another season" />}
      </div>
    );
  }

  // The owner, no season with this card yet.
  if (active) {
    const { you } = active.setup;
    return (
      <Link href={`/seasons/${active.id}`} className={`group ${box} transition hover:border-fg`}>
        <CalendarRange className="size-7 shrink-0 text-accent-text" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Season mode</span>
          <span className="block text-sm text-muted">
            You&apos;re mid-season with {you.year} {you.name}. Finish it or give it up to start one with this card.
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
      </Link>
    );
  }
  return (
    <div className={`${box} flex-col items-start sm:flex-row sm:items-center`}>
      <CalendarRange className="hidden size-7 shrink-0 text-accent-text sm:block" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Season mode</span>
        <span className="block text-sm text-muted">
          Take this card through a full season: 4 Slams, 9 Masters and the ATP Finals. Can you go unbeaten?
        </span>
      </span>
      <StartSeasonButton rollId={rollId} />
    </div>
  );
}
