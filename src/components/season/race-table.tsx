import { flag } from "@/lib/flags";
import { FINALS_FIELD } from "@/lib/season/calendar";
import type { RaceEntry } from "@/lib/season/season";

/** The points race: the top of the table, the Finals cut, and the player if they're below it. */
export function RaceTable({ race, rows = 10 }: { race: RaceEntry[]; rows?: number }) {
  const youAt = race.findIndex((r) => r.you);
  const shown = race.map((r, i) => ({ ...r, place: i + 1 })).filter((r, i) => i < rows || r.you);
  const started = race.some((r) => r.points > 0);
  return (
    <div className="overflow-hidden rounded-md border-2 border-line bg-surface">
      <ol>
        {shown.map((r, i) => (
          <li key={r.rival.playerId}>
            {/* The cut for the Finals, and a gap before the player when they're further down. */}
            {r.place === FINALS_FIELD + 1 && (
              <p className="border-t-2 border-dashed border-accent/50 bg-accent-soft/40 px-3 py-0.5 text-[10px] font-bold tracking-wider text-accent-text uppercase">
                Finals cut
              </p>
            )}
            {i > 0 && r.place > shown[i - 1].place + 1 && <p className="px-3 text-xs text-subtle">⋯</p>}
            <div
              className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-t border-line/60 px-3 py-1.5 text-sm ${
                r.you ? "bg-accent-soft font-semibold" : ""
              }`}
            >
              <span className="tabular font-mono text-xs text-subtle">{r.place}</span>
              <span className="min-w-0 truncate">
                <span aria-hidden>{flag(r.rival.country)}</span> <span className="text-subtle">&apos;{String(r.rival.year).slice(2)}</span>{" "}
                {r.rival.name}
                {r.you && <span className="ml-1 text-[10px] font-bold text-accent-text">YOU</span>}
              </span>
              <span className="tabular font-mono text-xs">{r.points.toLocaleString("en-US")}</span>
            </div>
          </li>
        ))}
      </ol>
      {!started && <p className="border-t border-line/60 px-3 py-2 text-xs text-muted">The race starts after the Australian Open.</p>}
      {started && youAt >= FINALS_FIELD && (
        <p className="border-t border-line/60 px-3 py-2 text-xs text-muted">
          {race[FINALS_FIELD - 1].points - race[youAt].points + 1} points to the top 8.
        </p>
      )}
    </div>
  );
}
