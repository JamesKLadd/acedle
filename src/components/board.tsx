import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** One row of any leaderboard (or the roll history). */
export interface BoardEntry {
  key: string | number;
  rank: number;
  name: string;
  avatarUrl?: string | null;
  detail: ReactNode;
  value: ReactNode;
  isViewer?: boolean;
}

const AVATAR_COLORS = ["bg-cat-ranking", "bg-cat-matches", "bg-cat-serve", "bg-cat-titles", "bg-cat-jackpot", "bg-cat-surface"];

/** Provider avatar, or initials on a color picked from the name. */
export function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full bg-surface-2 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

const MEDAL: Record<number, string> = {
  1: "bg-legendary text-accent-ink",
  2: "bg-[#c7d0dd] text-[#1c2638]",
  3: "bg-[#c98a54] text-[#2a1606]",
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`tabular grid h-7 min-w-7 place-items-center rounded-full px-1.5 font-mono text-sm font-semibold ${
        MEDAL[rank] ?? "text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

export function BoardList({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col gap-1">{children}</ol>;
}

export function BoardRow({ entry }: { entry: BoardEntry }) {
  return (
    <li
      className={`grid grid-cols-[2rem_auto_1fr_auto] items-center gap-3 rounded-md px-3 py-2 ${
        entry.isViewer ? "bg-accent-soft ring-1 ring-accent/60" : "hover:bg-surface-2/60"
      }`}
    >
      <RankBadge rank={entry.rank} />
      <Avatar src={entry.avatarUrl} name={entry.name} size={32} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">
          {entry.name}
          {entry.isViewer && <span className="ml-1.5 text-xs font-medium text-accent-text">(you)</span>}
        </span>
        <span className="block truncate text-xs text-muted">{entry.detail}</span>
      </span>
      <span className="tabular font-mono font-semibold">{entry.value}</span>
    </li>
  );
}

/** Separates the top of a board from the viewer's own rows further down. */
export function BoardGap() {
  return (
    <li aria-hidden className="py-1 text-center text-subtle">
      ⋯
    </li>
  );
}

const PODIUM_HEIGHT: Record<number, string> = { 1: "sm:pt-2", 2: "sm:mt-8", 3: "sm:mt-12" };

/**
 * The top three as cards: on phones a column of wide cards, #1 first; from sm
 * up side by side, #1 in the middle and raised. Fewer than three stay centered.
 */
export function Podium({ entries }: { entries: readonly BoardEntry[] }) {
  const [first, second, third] = entries;
  const order = [second, first, third].filter(Boolean) as BoardEntry[];
  return (
    <ol className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-center">
      {order.map((e) => (
        <li
          key={e.key}
          className={`relative flex items-center gap-3 rounded-lg border-2 bg-surface px-4 py-3 shadow-[4px_4px_0_0_var(--line)] sm:w-[calc((100%-1.5rem)/3)] sm:flex-col sm:gap-0 sm:px-3 sm:pt-5 sm:pb-4 sm:text-center ${
            e.rank === 1 ? "border-legendary/60" : "border-line"
          } ${e.isViewer ? "ring-2 ring-accent" : ""} ${PODIUM_HEIGHT[e.rank] ?? ""} ${
            e === first ? "order-first sm:order-none" : ""
          }`}
        >
          {e.rank === 1 && (
            <Crown className="absolute -top-3 left-8 size-6 text-legendary sm:left-1/2 sm:-translate-x-1/2" aria-hidden />
          )}
          <Avatar src={e.avatarUrl} name={e.name} size={e.rank === 1 ? 56 : 44} />
          <div className="min-w-0 flex-1 sm:contents">
            <span className="flex min-w-0 items-center gap-2 sm:mt-2 sm:max-w-full sm:flex-col sm:gap-1">
              <RankBadge rank={e.rank} />
              <span className="min-w-0 truncate font-semibold sm:max-w-full">{e.name}</span>
            </span>
            <span className="block truncate text-xs text-muted sm:order-last sm:mt-0.5 sm:w-full">{e.detail}</span>
          </div>
          <span className="tabular font-mono text-lg font-bold sm:mt-0.5">{e.value}</span>
        </li>
      ))}
    </ol>
  );
}

/** Podium for the top three, rows for the rest, then the viewer's rows below a gap. */
export function Board({ top, below, empty }: { top: readonly BoardEntry[]; below: readonly BoardEntry[]; empty: ReactNode }) {
  if (top.length === 0) return <p className="rounded-lg border-2 border-dashed border-line py-12 text-center text-muted">{empty}</p>;
  return (
    <>
      <Podium entries={top.slice(0, 3)} />
      {top.length > 3 || below.length > 0 ? (
        <BoardList>
          {top.slice(3).map((e) => (
            <BoardRow key={e.key} entry={e} />
          ))}
          {below.length > 0 && <BoardGap />}
          {below.map((e) => (
            <BoardRow key={e.key} entry={e} />
          ))}
        </BoardList>
      ) : null}
    </>
  );
}

/** ‹ Label › navigation between days or weeks. */
export function PeriodNav({
  label,
  prevHref,
  nextHref,
  currentHref,
  isCurrent,
}: {
  label: ReactNode;
  prevHref: string | null;
  nextHref: string | null;
  currentHref: string;
  isCurrent: boolean;
}) {
  const arrow =
    "grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted transition hover:text-fg aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <div className="mb-4 flex items-center gap-2">
      <Link href={prevHref ?? "#"} aria-disabled={!prevHref} aria-label="Earlier" className={arrow}>
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <p className="font-display text-xl font-bold tracking-wide uppercase">{label}</p>
      </div>
      <Link href={nextHref ?? "#"} aria-disabled={!nextHref} aria-label="Later" className={arrow}>
        <ChevronRight className="size-4" aria-hidden />
      </Link>
      {!isCurrent && (
        <Link href={currentHref} className="ml-1 text-sm font-medium text-accent-text underline underline-offset-4">
          Latest
        </Link>
      )}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2 sm:h-40" />
        ))}
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-surface-2" />
      ))}
    </div>
  );
}
