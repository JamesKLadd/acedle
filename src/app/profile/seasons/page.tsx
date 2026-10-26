import { CalendarRange, ChevronRight, Crown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board";
import { buttonClass } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { flag } from "@/lib/flags";
import { fmtDate, fmtScore } from "@/lib/format";

export const metadata: Metadata = { title: "Your seasons · Acedle" };

const STATUS = {
  active: ["In progress", "border-accent text-accent-text"],
  finished: ["Finished", "border-line text-muted"],
  abandoned: ["Unfinished", "border-line text-subtle"],
} as const;

export default function SeasonsTab() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Seasons />
    </Suspense>
  );
}

/** The viewer's seasons, the one in progress first (RLS limits them to their own). */
async function Seasons() {
  const { supabase, userId } = await getViewer();
  const { data, error } = userId
    ? await supabase
        .from("seasons")
        .select("id, year, player_name, status, wins, losses, titles, points, calendar_slam, created_at, country:setup->you->>country")
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) console.error(`Couldn't load seasons: ${error.message}`);
  const seasons = [...(data ?? [])].sort((a, b) => Number(b.status === "active") - Number(a.status === "active"));

  if (seasons.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-line px-6 py-12 text-center">
        <CalendarRange className="mx-auto size-8 text-subtle" aria-hidden />
        <p className="mt-3 text-muted">
          No seasons yet. Take any card you&apos;ve rolled through a full season: 4 Slams, 9 Masters and the ATP Finals.
        </p>
        <Link href="/profile" className={`${buttonClass()} mt-4`}>
          Pick a card
        </Link>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {seasons.map((s) => {
        const [label, style] = STATUS[s.status];
        const perfect = s.status === "finished" && s.losses === 0;
        return (
          <li key={s.id}>
            <Link
              href={`/seasons/${s.id}`}
              className={`group grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border-2 bg-surface px-4 py-3 shadow-[3px_3px_0_0_var(--line)] transition hover:border-accent/60 ${
                perfect ? "border-legendary/60" : "border-line"
              }`}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-accent-text">{s.year}</span>
                  <span className="truncate font-semibold">
                    {s.country && <span aria-hidden>{flag(s.country)} </span>}
                    {s.player_name}
                  </span>
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span
                    className={`rounded-[4px] border-2 px-1 text-[10px] font-bold tracking-wider uppercase ${style}`}
                  >
                    {label}
                  </span>
                  <span>
                    {s.titles} {s.titles === 1 ? "title" : "titles"} · {fmtScore(s.points)} pts
                  </span>
                  {perfect && (
                    <span className="flex items-center gap-1 font-semibold text-legendary">
                      <Crown className="size-3.5" aria-hidden /> Perfect season
                    </span>
                  )}
                  {s.calendar_slam && <span className="font-semibold text-legendary">Calendar Slam</span>}
                  <span className="hidden sm:inline">· started {fmtDate(s.created_at.slice(0, 10))}</span>
                </span>
              </span>
              <span className="tabular font-mono text-lg font-bold">
                {s.wins}–{s.losses}
              </span>
              <ChevronRight className="size-4 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
