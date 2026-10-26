import { Trophy } from "lucide-react";

import { CALENDAR } from "@/lib/season/calendar";
import type { EventResult, EventStatus, SeasonState } from "@/lib/season/season";

import { COURT_COLOR, COURT_LABEL } from "./court";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Each calendar event's status and the player's result, in calendar order. */
export function calendarRows(state: SeasonState): { status: EventStatus; result: EventResult | null }[] {
  return [...state.knockouts, state.finals].map((e) => ({ status: e.status, result: e.result }));
}

/**
 * The season's events as tiles, colored by court: each shows how the player
 * did. Tiles are buttons that pick the event shown below.
 */
export function SeasonCalendar({
  state,
  selected,
  onSelect,
}: {
  state: SeasonState;
  selected: number;
  onSelect: (event: number) => void;
}) {
  const rows = calendarRows(state);
  return (
    <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-7">
      {CALENDAR.map((event, i) => {
        const { status, result } = rows[i];
        const current = status === "current";
        return (
          <li key={event.id}>
            <button
              onClick={() => onSelect(i)}
              aria-pressed={selected === i}
              className={`flex h-full w-full flex-col overflow-hidden rounded-md border-2 bg-surface text-left transition hover:border-fg ${
                selected === i ? "border-fg shadow-[3px_3px_0_0_var(--line)]" : "border-line"
              } ${status === "upcoming" || status === "missed" ? "opacity-70" : ""}`}
            >
              <span className="h-1.5 w-full shrink-0" style={{ background: COURT_COLOR[event.court] }} />
              <span className="flex flex-1 flex-col gap-0.5 px-2 py-1.5 sm:px-2.5 sm:py-2">
                <span className="flex items-center justify-between gap-1 text-[9px] font-bold tracking-wider text-muted uppercase sm:text-[10px]">
                  <span>
                    {MONTHS[event.month - 1]} · {event.kind === "masters" ? "1000" : event.kind === "slam" ? "Slam" : "Finals"}
                  </span>
                  {current && <span className="size-2 animate-pulse rounded-full bg-accent" aria-label="Now" />}
                </span>
                <span className="font-display text-xs leading-tight break-words uppercase sm:text-sm">{event.name}</span>
                <span className="hidden text-[11px] text-subtle sm:block">{COURT_LABEL[event.court]}</span>
                <span
                  className={`mt-auto flex items-center gap-1 pt-1 text-[10px] leading-tight font-semibold sm:text-xs ${
                    result?.title ? "text-legendary" : result ? "text-fg" : current ? "text-accent-text" : "text-subtle"
                  }`}
                >
                  {result?.title && <Trophy className="size-3.5 shrink-0" aria-hidden />}
                  {result ? result.label : current ? "Now playing" : status === "missed" ? "Didn't qualify" : "Upcoming"}
                </span>
                {result && (
                  <span className="tabular font-mono text-[10px] text-muted sm:text-[11px]">
                    +{result.points.toLocaleString("en-US")} pts
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
