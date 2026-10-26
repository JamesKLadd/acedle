import { CalendarRange, CircleUser, Crown, Dices, LogIn } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Board, PeriodNav, type BoardEntry } from "@/components/board";
import { buttonClass } from "@/components/ui";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { flag } from "@/lib/flags";
import { fmtDate, fmtDay, fmtScore, fmtShortDay } from "@/lib/format";
import {
  boardDay,
  FIRST_DAY,
  getAllTimeBoard,
  getRollBoard,
  getSeasonBoard,
  splitBoard,
  type AllTimeEntry,
  type RollBoardEntry,
  type SeasonBoardEntry,
} from "@/lib/leaderboard";
import { addDays, utcDay, weekOf } from "@/lib/roll/daily";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const rollEntry = (showDay: boolean) => (e: RollBoardEntry, i: number): BoardEntry => ({
  key: i,
  rank: e.rank,
  name: e.handle,
  avatarUrl: e.avatar_url,
  detail: `${showDay ? `${fmtShortDay(e.day)} · ` : ""}${e.year} ${e.player_name} · #${e.final_rank}`,
  value: fmtScore(e.score),
  isViewer: e.is_viewer,
});

const allTimeEntry = (e: AllTimeEntry, i: number): BoardEntry => ({
  key: i,
  rank: e.rank,
  name: e.handle,
  avatarUrl: e.avatar_url,
  detail: `${e.roll_count} ${e.roll_count === 1 ? "roll" : "rolls"} · ${fmtScore(e.total_score / e.roll_count)} avg`,
  value: fmtScore(e.total_score),
  isViewer: e.is_viewer,
});

const seasonEntry = (e: SeasonBoardEntry, i: number): BoardEntry => ({
  key: i,
  rank: e.rank,
  name: e.handle,
  avatarUrl: e.avatar_url,
  detail: (
    <Link href={`/seasons/${e.season_id}`} className="hover:text-fg hover:underline">
      {e.country ? `${flag(e.country)} ` : ""}
      {e.year} {e.player_name} · {e.titles} {e.titles === 1 ? "title" : "titles"} · {fmtScore(e.points)} pts
      {e.calendar_slam ? " · Calendar Slam" : ""}
    </Link>
  ),
  value: (
    <span className="inline-flex items-center gap-1">
      {e.losses === 0 && <Crown className="size-4 text-legendary" aria-label="Perfect season" />}
      {e.wins}–{e.losses}
    </span>
  ),
  isViewer: e.is_viewer,
});

/** Board rows with the player's flag in front of the season. */
function withFlags(entries: RollBoardEntry[], showDay: boolean, countries: Map<number, string>) {
  return entries.map((e, i) => {
    const entry = rollEntry(showDay)(e, i);
    const c = countries.get(e.player_id);
    return c ? { ...entry, detail: `${flag(c)} ${entry.detail}` } : entry;
  });
}

async function countriesOf(entries: RollBoardEntry[], viewer: Viewer) {
  if (entries.length === 0) return new Map<number, string>();
  const ids = [...new Set(entries.map((e) => e.player_id))];
  const { data } = await viewer.supabase.from("players").select("id, country").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.country]));
}

export async function DailyBoard({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const today = utcDay();
  const day = boardDay(params.day, today);
  const entries = await getRollBoard(viewer.supabase, day, day);
  const { top, below } = splitBoard(entries);
  const countries = await countriesOf(entries, viewer);
  const isToday = day === today;
  return (
    <>
      <PeriodNav
        label={isToday ? `Today · ${fmtShortDay(day)}` : fmtDay(day)}
        prevHref={day > FIRST_DAY ? `/leaderboard?day=${addDays(day, -1)}` : null}
        nextHref={isToday ? null : `/leaderboard?day=${addDays(day, 1)}`}
        currentHref="/leaderboard"
        isCurrent={isToday}
      />
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries}>
        {isToday ? "You haven't rolled today." : "You didn't roll that day."}
      </ViewerNote>
      <Board
        top={withFlags(top, false, countries)}
        below={withFlags(below, false, countries).map((e, i) => ({ ...e, key: `b${i}` }))}
        empty={isToday ? "No one has rolled today yet. Be the first!" : "No rolls that day."}
      />
    </>
  );
}

export async function WeeklyBoard({ searchParams }: { searchParams: SearchParams }) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const thisWeek = weekOf(utcDay());
  const monday = weekOf(boardDay(params.week, utcDay()));
  const sunday = addDays(monday, 6);
  const entries = await getRollBoard(viewer.supabase, monday, sunday);
  const { top, below } = splitBoard(entries);
  const countries = await countriesOf(entries, viewer);
  const isCurrent = monday === thisWeek;
  return (
    <>
      <PeriodNav
        label={`${fmtDate(monday).replace(/, \d{4}$/, "")} – ${fmtDate(sunday)}`}
        prevHref={addDays(monday, 6) > FIRST_DAY ? `/leaderboard/weekly?week=${addDays(monday, -7)}` : null}
        nextHref={isCurrent ? null : `/leaderboard/weekly?week=${addDays(monday, 7)}`}
        currentHref="/leaderboard/weekly"
        isCurrent={isCurrent}
      />
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries} best>
        {isCurrent ? "You haven't rolled this week." : "You didn't roll that week."}
      </ViewerNote>
      <Board
        top={withFlags(top, true, countries)}
        below={withFlags(below, true, countries).map((e, i) => ({ ...e, key: `b${i}` }))}
        empty="No rolls that week yet."
      />
      <p className="mt-4 text-center text-xs text-subtle">Every roll counts, so one player can appear up to 7 times.</p>
    </>
  );
}

export async function AllTimeBoard() {
  const viewer = await getViewer();
  const entries = await getAllTimeBoard(viewer.supabase);
  const { top, below } = splitBoard(entries);
  return (
    <>
      <div className="mb-4 text-center">
        <p className="font-display text-xl font-bold tracking-wide uppercase">All-time points</p>
        <p className="text-xs text-muted">The total of every daily roll</p>
      </div>
      <ViewerNote viewer={viewer} mine={entries.find((e) => e.is_viewer)?.rank} entries={entries[0]?.entries}>
        Roll to get on the board.
      </ViewerNote>
      <Board
        top={top.map(allTimeEntry)}
        below={below.map((e, i) => ({ ...allTimeEntry(e, i), key: `b${i}` }))}
        empty="No one is on the board yet."
      />
    </>
  );
}

export async function SeasonsBoard() {
  const viewer = await getViewer();
  let entries: SeasonBoardEntry[];
  try {
    entries = await getSeasonBoard(viewer.supabase);
  } catch (e) {
    // The board needs the season_leaderboard migration.
    console.error(e);
    return <p className="rounded-lg border-2 border-dashed border-line py-12 text-center text-muted">The seasons board isn&apos;t open yet.</p>;
  }
  const { top, below } = splitBoard(entries);
  return (
    <>
      <div className="mb-4 text-center">
        <p className="font-display text-xl font-bold tracking-wide uppercase">Best seasons</p>
        <p className="text-xs text-muted">Each player&apos;s best finished season: most wins, then fewest losses, then points</p>
      </div>
      <ViewerNote
        viewer={viewer}
        mine={entries.find((e) => e.is_viewer)?.rank}
        entries={entries[0]?.entries}
        missingIcon={CalendarRange}
        missingAction={
          <Link href="/profile/seasons" className={buttonClass({ size: "sm" })}>
            Your seasons
          </Link>
        }
      >
        Finish a season to get on the board.
      </ViewerNote>
      <Board
        top={top.map(seasonEntry)}
        below={below.map((e, i) => ({ ...seasonEntry(e, i), key: `b${i}` }))}
        empty="No one has finished a season yet."
      />
    </>
  );
}

/** Where the viewer stands, or how to get on the board. */
function ViewerNote({
  viewer,
  mine,
  entries,
  best = false,
  missingIcon = Dices,
  missingAction,
  children: missing,
}: {
  viewer: Viewer;
  mine: number | undefined;
  entries: number | undefined;
  /** The viewer can have several entries; `mine` is the best one. */
  best?: boolean;
  /** For an account not on the board: the icon and the way on (rolling, by default). */
  missingIcon?: typeof Dices;
  missingAction?: ReactNode;
  children: ReactNode;
}) {
  let icon = CircleUser;
  let text: ReactNode;
  let action: ReactNode = null;
  if (viewer.isAccount && mine !== undefined) {
    text = (
      <>
        {best ? "Your best is" : "You're"} <strong className="text-fg">#{mine}</strong> of {entries}.
      </>
    );
  } else if (viewer.isAccount) {
    icon = missingIcon;
    text = missing;
    action = missingAction ?? (
      <Link href="/" className={buttonClass({ size: "sm" })}>
        Roll now
      </Link>
    );
  } else {
    icon = LogIn;
    text = viewer.isGuest ? "Guest rolls don't appear on leaderboards." : "Roll and sign in to join the leaderboards.";
    action = (
      <Link href="/" className={buttonClass({ size: "sm", variant: "secondary" })}>
        {viewer.isGuest ? "Sign in" : "Play"}
      </Link>
    );
  }
  const Icon = icon;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border-2 border-line bg-surface shadow-[3px_3px_0_0_var(--line)] px-4 py-2.5 text-sm text-muted">
      <Icon className="size-4 shrink-0 text-accent-text" aria-hidden />
      <span className="flex-1">{text}</span>
      {action}
    </div>
  );
}
