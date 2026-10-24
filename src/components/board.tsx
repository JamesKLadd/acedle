import type { ReactNode } from "react";

/** Ranked list used by the leaderboards and the roll history. */
export function BoardList({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col">{children}</ol>;
}

export function BoardRow({
  rank,
  name,
  detail,
  value,
  highlight = false,
}: {
  rank: ReactNode;
  name: ReactNode;
  detail: ReactNode;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <li
      className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg px-3 py-2 ${
        highlight ? "bg-accent-soft ring-1 ring-accent/60" : ""
      }`}
    >
      <span className="font-mono text-sm text-muted tabular-nums">{rank}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        <span className="block truncate text-xs text-muted">{detail}</span>
      </span>
      <span className="font-mono font-semibold tabular-nums">{value}</span>
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

export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
      ))}
    </div>
  );
}
