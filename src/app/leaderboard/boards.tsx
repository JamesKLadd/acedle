import Link from "next/link";
import type { ReactNode } from "react";

import { BoardGap, BoardList, BoardRow } from "@/components/board";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { fmtDate, fmtDay, fmtScore, fmtShortDay } from "@/lib/format";
import { getAllTimeBoard, getRollBoard, splitBoard, type RollBoardEntry } from "@/lib/leaderboard";
import { addDays, utcDay, weekOf } from "@/lib/roll/daily";

const linkClass = "font-medium text-lime-600 underline underline-offset-4 dark:text-lime-400";

export async function DailyBoard() {
  const viewer = await getViewer();
  const day = utcDay();
  const entries = await getRollBoard(viewer.supabase, day, day);
  return (
    <>
      <BoardHeading title={fmtDay(day)} note="Resets at midnight UTC" />
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries}>
        You haven&apos;t rolled today.
      </ViewerNote>
      <RollEntries entries={entries} showDay={false} empty="No one has rolled today yet." />
    </>
  );
}

export async function WeeklyBoard() {
  const viewer = await getViewer();
  const monday = weekOf(utcDay());
  const sunday = addDays(monday, 6);
  const entries = await getRollBoard(viewer.supabase, monday, sunday);
  return (
    <>
      <BoardHeading title={`${fmtDate(monday)} – ${fmtDate(sunday)}`} note="Every roll counts, so you can appear up to 7 times" />
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries} best>
        You haven&apos;t rolled this week.
      </ViewerNote>
      <RollEntries entries={entries} showDay empty="No one has rolled this week yet." />
    </>
  );
}

export async function AllTimeBoard() {
  const viewer = await getViewer();
  const entries = await getAllTimeBoard(viewer.supabase);
  const { top, below } = splitBoard(entries);
  const row = (e: (typeof entries)[number], i: number) => (
    <BoardRow
      key={i}
      rank={`#${e.rank}`}
      name={e.handle}
      detail={`${e.roll_count} ${e.roll_count === 1 ? "roll" : "rolls"} · ${fmtScore(e.total_score / e.roll_count)} average`}
      value={fmtScore(e.total_score)}
      highlight={e.is_viewer}
    />
  );
  return (
    <>
      <BoardHeading title="All-time points" note="Total of every daily roll" />
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries}>
        Roll to get on the board.
      </ViewerNote>
      {top.length === 0 ? (
        <Empty>No one is on the board yet.</Empty>
      ) : (
        <BoardList>
          {top.map(row)}
          {below.length > 0 && <BoardGap />}
          {below.map((e, i) => row(e, top.length + i))}
        </BoardList>
      )}
    </>
  );
}

function RollEntries({ entries, showDay, empty }: { entries: RollBoardEntry[]; showDay: boolean; empty: string }) {
  const { top, below } = splitBoard(entries);
  if (top.length === 0) return <Empty>{empty}</Empty>;
  const row = (e: RollBoardEntry, i: number) => (
    <BoardRow
      key={i}
      rank={`#${e.rank}`}
      name={e.handle}
      detail={`${showDay ? `${fmtShortDay(e.day)} · ` : ""}${e.year} ${e.player_name} · #${e.final_rank}`}
      value={fmtScore(e.score)}
      highlight={e.is_viewer}
    />
  );
  return (
    <BoardList>
      {top.map(row)}
      {below.length > 0 && <BoardGap />}
      {below.map((e, i) => row(e, top.length + i))}
    </BoardList>
  );
}

function BoardHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-xs text-zinc-500">{note}</p>
    </div>
  );
}

/** Where the viewer stands, or how to get on the board. */
function ViewerNote({
  viewer,
  mine,
  entries,
  best = false,
  children: missing,
}: {
  viewer: Viewer;
  mine: number | undefined;
  entries: number | undefined;
  /** The viewer can have several entries; `mine` is the best one. */
  best?: boolean;
  children: ReactNode;
}) {
  let text: ReactNode;
  if (viewer.isAccount) {
    text =
      mine !== undefined ? (
        <>
          {best ? "Your best is" : "You're"} <strong className="text-foreground">#{mine}</strong> of {entries}.
        </>
      ) : (
        <>
          {missing}{" "}
          <Link href="/" className={linkClass}>
            Roll now
          </Link>
        </>
      );
  } else if (viewer.isGuest) {
    text = (
      <>
        Guest rolls don&apos;t appear on leaderboards.{" "}
        <Link href="/" className={linkClass}>
          Sign in
        </Link>{" "}
        to join.
      </>
    );
  } else {
    text = (
      <>
        <Link href="/" className={linkClass}>
          Roll and sign in
        </Link>{" "}
        to join the leaderboards.
      </>
    );
  }
  return <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-zinc-500">{children}</p>;
}
