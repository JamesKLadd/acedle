import { Medal as MedalGlyph } from "lucide-react";
import Link from "next/link";

import { SectionTitle } from "@/components/ui";
import { MEDALS, medalCount, type GoalProgress, type Medal } from "@/lib/profile/goals";

const MEDAL_BG: Record<Medal, string> = { bronze: "bg-bronze", silver: "bg-silver", gold: "bg-gold" };
const MEDAL_NAME: Record<Medal, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

/** A medal disc, or an empty dashed one when there's no medal yet. */
export function MedalDisc({ medal, size = "md" }: { medal: Medal | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-5" : "size-10";
  const icon = size === "sm" ? "size-3" : "size-5";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${box} ${
        medal ? `${MEDAL_BG[medal]} text-zinc-950` : "border-2 border-dashed border-line text-subtle"
      }`}
      role={medal ? "img" : undefined}
      aria-label={medal ? `${MEDAL_NAME[medal]} medal` : undefined}
    >
      <MedalGlyph className={icon} aria-hidden />
    </span>
  );
}

function GoalTile({ goal }: { goal: GoalProgress }) {
  // Progress toward the next medal; full once gold.
  const target = goal.next ?? goal.levels[2];
  const pct = Math.min(100, (100 * goal.count) / target);
  return (
    <li
      className={`flex gap-3 rounded-md border-2 px-3 py-2.5 ${
        goal.medal ? "border-line bg-surface" : "border-dashed border-line bg-transparent"
      }`}
    >
      <MedalDisc medal={goal.medal} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{goal.name}</span>
          <span className="tabular shrink-0 font-mono text-xs text-muted">
            {goal.next === null ? `${goal.count} ${goal.unit}` : `${goal.count} / ${goal.next}`}
          </span>
        </div>
        <p className="text-xs text-muted">{goal.description}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${goal.next === null ? "bg-gold" : "bg-accent"}`}
              style={{ width: `${Math.max(pct, goal.count > 0 ? 3 : 0)}%` }}
            />
          </div>
          <ol className="flex shrink-0 gap-2 text-[11px] text-subtle" aria-label="Medal levels">
            {MEDALS.map((m, i) => {
              const reached = goal.count >= goal.levels[i];
              return (
                <li key={m} className={`flex items-center gap-1 ${reached ? "font-semibold text-fg" : ""}`}>
                  <span className={`size-2 rounded-full ${reached ? MEDAL_BG[m] : "border border-line"}`} aria-hidden />
                  <span className="sr-only">{MEDAL_NAME[m]}: </span>
                  <span className="tabular font-mono">{goal.levels[i]}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </li>
  );
}

const GROUPS = [
  { group: "collect", label: "Collecting" },
  { group: "play", label: "Playing" },
] as const;

/** Every goal, collecting first, with the medals reached out of all there are. */
export function GoalBoard({ progress }: { progress: readonly GoalProgress[] }) {
  return (
    <section id="goals" className="scroll-mt-20">
      <div className="mb-3 flex items-baseline justify-between">
        <SectionTitle>Goals</SectionTitle>
        <span className="tabular text-xs text-muted">
          {medalCount(progress)} / {progress.length * MEDALS.length} medals
        </span>
      </div>
      {GROUPS.map(({ group, label }) => (
        <div key={group} className="mb-4">
          <p className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">{label}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {progress
              .filter((g) => g.group === group)
              .map((g) => (
                <GoalTile key={g.id} goal={g} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** "New medals" under today's card: what it (and its tournament and seasons) reached. */
export function NewMedals({ medals }: { medals: readonly { goal: GoalProgress; medal: Medal }[] }) {
  if (medals.length === 0) return null;
  return (
    <Link
      href="/profile/dex#goals"
      className="flex flex-col gap-2 rounded-md border-2 border-line bg-surface px-4 py-3 shadow-[3px_3px_0_0_var(--line)] transition hover:border-accent/60"
    >
      <span className="text-[11px] font-bold tracking-wider text-muted uppercase">
        {medals.length === 1 ? "New medal" : "New medals"}
      </span>
      <ul className="flex flex-col gap-1.5">
        {medals.map(({ goal, medal }) => (
          <li key={goal.id} className="flex items-center gap-2 text-sm">
            <MedalDisc medal={medal} size="sm" />
            <span>
              <strong>{goal.name}</strong> · {MEDAL_NAME[medal].toLowerCase()}{" "}
              <span className="text-muted">
                ({goal.count} {goal.unit})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
