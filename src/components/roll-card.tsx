import type { PlayerSeason } from "@/lib/data/types";
import { fmtMult, fmtScore, fmtYmd } from "@/lib/format";
import type { BadgeCategory, EarnedBadge, ScoreResult } from "@/lib/scoring/types";

export const CATEGORY_STYLES: Record<BadgeCategory, string> = {
  titles: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  surface: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  ranking: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  matches: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  serve: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  profile: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  jackpot: "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-200",
};

export const CARD_CLASS = "rounded-xl border border-zinc-200 p-5 dark:border-zinc-800";

export function BadgeRow({ badge, className = "" }: { badge: EarnedBadge; className?: string }) {
  return (
    <li className={`flex items-center gap-3 py-2 ${className}`}>
      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[badge.category]}`}>
        {badge.category}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{badge.name}</span>
        <span className="block truncate text-sm text-zinc-500 dark:text-zinc-400">{badge.detail}</span>
      </span>
      <span className="shrink-0 font-mono tabular-nums">
        {badge.multiplier !== null ? fmtMult(badge.multiplier) : `+${fmtScore(badge.points)}`}
      </span>
    </li>
  );
}

/** Player name and headline numbers for the season. */
export function PlayerLine({ season: s }: { season: PlayerSeason }) {
  return (
    <>
      <h2 className="text-2xl font-bold">{s.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        #{s.ranking.final} · {s.country} · {s.matches.wins}–{s.matches.losses} · {s.titles.length} titles
      </p>
    </>
  );
}

export function ScoreTotals({
  base,
  multiplier,
  total,
  final = true,
}: {
  base: number;
  multiplier: number;
  total: number;
  /** False while a reveal is still counting. */
  final?: boolean;
}) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-200 pt-4 text-center dark:border-zinc-800">
      <div>
        <dt className="text-xs text-zinc-500 uppercase">Base</dt>
        <dd className="font-mono tabular-nums">{fmtScore(base)}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500 uppercase">Multiplier</dt>
        <dd className="font-mono tabular-nums">{fmtMult(multiplier)}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500 uppercase">Score</dt>
        <dd
          className={`font-mono text-xl font-bold tabular-nums transition-colors ${
            final ? "text-lime-600 dark:text-lime-400" : ""
          }`}
        >
          {fmtScore(total)}
        </dd>
      </div>
    </dl>
  );
}

/** A rolled player-season with its badges and score. */
export function RollCard({ season: s, score }: { season: PlayerSeason; score: ScoreResult }) {
  return (
    <section className={CARD_CLASS}>
      <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
        {s.year}
        {s.live && ` · live season, ranked as of ${fmtYmd(s.dataAsOf)}`}
      </p>
      <PlayerLine season={s} />

      <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
        {score.badges.map((b) => (
          <BadgeRow key={b.id} badge={b} />
        ))}
      </ul>

      <ScoreTotals base={score.base} multiplier={score.multiplier} total={score.total} />
    </section>
  );
}
