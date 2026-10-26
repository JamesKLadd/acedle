import { Newspaper, Skull, Sparkles, TrendingDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SectionTitle } from "@/components/ui";
import { flag } from "@/lib/flags";
import { CALENDAR } from "@/lib/season/calendar";
import type { PlayedMatch } from "@/lib/season/season";
import { pct, who, type Headline, type Rivalry, type SeasonRecap, type Tone } from "@/lib/season/stories";

import { COURT_COLOR, COURT_LABEL } from "./court";

const TONE: Record<Tone, { icon: typeof Sparkles; color: string; label: string }> = {
  good: { icon: Sparkles, color: "text-cat-matches", label: "Good news" },
  bad: { icon: TrendingDown, color: "text-accent-text", label: "Bad news" },
  info: { icon: Newspaper, color: "text-muted", label: "Around the tour" },
};

/** Headlines as a list, each with its tone and (optionally) its event. */
export function HeadlineList({ headlines, showEvent = false }: { headlines: readonly Headline[]; showEvent?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {headlines.map((h) => {
        const { icon: Icon, color, label } = TONE[h.tone];
        return (
          <li key={`${h.event}|${h.text}`} className="flex items-start gap-2.5 text-sm">
            <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} role="img" aria-label={label} />
            <span className="min-w-0">
              {showEvent && (
                <span className="mr-1.5 rounded-[3px] bg-surface-2 px-1 font-mono text-[10px] font-bold text-muted">
                  {CALENDAR[h.event].short}
                </span>
              )}
              {h.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const LATEST = 5;

/** The season's storylines, latest event first: the last few, or all of them. */
export function Storylines({ headlines }: { headlines: readonly Headline[] }) {
  const [all, setAll] = useState(false);
  if (headlines.length === 0) return null;
  // Latest event first, each event's biggest story first.
  const ordered = [...headlines].sort((a, b) => b.event - a.event);
  const shown = all ? ordered : ordered.slice(0, LATEST);
  return (
    <section>
      <SectionTitle className="mb-3">Storylines</SectionTitle>
      <div className="rounded-md border-2 border-line bg-surface px-4 py-3">
        <HeadlineList headlines={shown} showEvent />
        {ordered.length > LATEST && (
          <button
            onClick={() => setAll(!all)}
            className="mt-3 text-xs font-semibold text-accent-text hover:underline"
            aria-expanded={all}
          >
            {all ? "Show the latest" : `Show all ${ordered.length}`}
          </button>
        )}
      </div>
    </section>
  );
}

const RIVALRIES_SHOWN = 8;

/** Rivals met most often (more than once), the nemesis always among them: head-to-head records, meeting by meeting. */
export function Rivalries({ rivalries, nemesis }: { rivalries: readonly Rivalry[]; nemesis: Rivalry | null }) {
  const top = rivalries.filter((r) => r.meetings.length > 1).slice(0, RIVALRIES_SHOWN);
  const shown = nemesis && !top.includes(nemesis) ? [...top.slice(0, RIVALRIES_SHOWN - 1), nemesis] : top;
  if (shown.length === 0) return null;
  return (
    <section>
      <SectionTitle className="mb-3">Rivalries</SectionTitle>
      <p className="mb-3 text-sm text-muted">
        Rivals you&apos;ve met more than once. Anyone who beats you twice can become your nemesis.
      </p>
      <ol className="overflow-hidden rounded-md border-2 border-line bg-surface">
        {shown.map((r) => (
          <li
            key={r.rival.playerId}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-line/60 px-3 py-2 text-sm first:border-t-0"
          >
            <span className="min-w-0 truncate">
              <span aria-hidden>{flag(r.rival.country)}</span>{" "}
              <span className="text-subtle">&apos;{String(r.rival.year).slice(2)}</span> {r.rival.name}
              {r === nemesis && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-[3px] bg-accent px-1 align-middle text-[10px] font-bold tracking-wider text-accent-ink uppercase">
                  <Skull className="size-3" aria-hidden /> Nemesis
                </span>
              )}
            </span>
            <span
              className={`tabular font-mono text-sm font-bold ${
                r.wins > r.losses ? "text-cat-matches" : r.wins < r.losses ? "text-accent-text" : ""
              }`}
              aria-label={`${r.wins} wins, ${r.losses} losses`}
            >
              {r.wins}–{r.losses}
            </span>
            <span className="col-span-2 flex flex-wrap gap-1">
              {r.meetings.map((m, i) => (
                <span
                  key={i}
                  title={`${CALENDAR[m.event].name}, ${m.round.toLowerCase()}: ${m.won ? "won" : "lost"}`}
                  className={`rounded-[3px] px-1 font-mono text-[10px] font-bold ${
                    m.won ? "bg-cat-matches/15 text-cat-matches" : "bg-accent-soft text-accent-text"
                  }`}
                >
                  {CALENDAR[m.event].short} {m.won ? "W" : "L"}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MatchLine({ match, verb }: { match: PlayedMatch; verb: string }) {
  return (
    <>
      {verb} {who(match.opponent)} at {CALENDAR[match.event].name} with a{" "}
      <strong className="tabular font-mono">{pct(match.odds)}</strong> chance
    </>
  );
}

/** The season in a few lines: upsets, streaks, the nemesis, the best rival and each court. */
export function Recap({ recap }: { recap: SeasonRecap }) {
  const items: [string, ReactNode][] = [
    [
      "Biggest upset",
      recap.biggestUpset ? <MatchLine match={recap.biggestUpset} verb="Beat" /> : "No win as the underdog",
    ],
    [
      "Toughest loss",
      recap.toughestLoss ? <MatchLine match={recap.toughestLoss} verb="Lost to" /> : "No loss as the favourite",
    ],
    ["Longest streak", `${recap.longestStreak} ${recap.longestStreak === 1 ? "win" : "wins"} in a row`],
    [
      "Nemesis",
      recap.nemesis
        ? `${who(recap.nemesis.rival)}, ${recap.nemesis.wins}–${recap.nemesis.losses}`
        : "Nobody beat you twice",
    ],
    [
      "Top rival",
      recap.topRival
        ? `${who(recap.topRival.rival)}: No. ${recap.topRival.place} in the race, ${recap.topRival.titles} ${
            recap.topRival.titles === 1 ? "title" : "titles"
          }`
        : "—",
    ],
  ];
  return (
    <div className="w-full max-w-lg text-left">
      <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      {recap.courts.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <caption className="mb-1 text-left text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
            By court
          </caption>
          <tbody>
            {recap.courts.map((c) => (
              <tr key={c.court} className="border-t border-line/60">
                <th scope="row" className="py-1 text-left font-normal">
                  <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: COURT_COLOR[c.court] }} />
                  {COURT_LABEL[c.court]}
                </th>
                <td className="tabular py-1 text-right font-mono">
                  {c.wins}–{c.losses}
                </td>
                <td className="tabular py-1 text-right font-mono text-muted">{c.points.toLocaleString("en-US")} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
