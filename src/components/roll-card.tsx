import type { PlayerSeason } from "@/lib/data/types";
import { fmtMult, fmtScore, fmtYmd } from "@/lib/format";
import type { BadgeCategory, EarnedBadge, ScoreResult } from "@/lib/scoring/types";

export const CATEGORY_STYLES: Record<BadgeCategory, string> = {
  titles: "bg-cat-titles/15 text-cat-titles",
  surface: "bg-cat-surface/15 text-cat-surface",
  ranking: "bg-cat-ranking/15 text-cat-ranking",
  matches: "bg-cat-matches/15 text-cat-matches",
  serve: "bg-cat-serve/15 text-cat-serve",
  profile: "bg-cat-profile/15 text-cat-profile",
  jackpot: "bg-cat-jackpot/15 text-cat-jackpot",
};

export const CARD_CLASS = "rounded-xl border border-line p-5";

export function BadgeRow({ badge, className = "" }: { badge: EarnedBadge; className?: string }) {
  return (
    <li className={`flex items-center gap-3 py-2 ${className}`}>
      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[badge.category]}`}>
        {badge.category}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{badge.name}</span>
        <span className="block truncate text-sm text-muted">{badge.detail}</span>
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
      <p className="text-sm text-muted">
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
    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
      <div>
        <dt className="text-xs text-muted uppercase">Base</dt>
        <dd className="font-mono tabular-nums">{fmtScore(base)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted uppercase">Multiplier</dt>
        <dd className="font-mono tabular-nums">{fmtMult(multiplier)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted uppercase">Score</dt>
        <dd
          className={`font-mono text-xl font-bold tabular-nums transition-colors ${
            final ? "text-accent-text" : ""
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
      <p className="font-mono text-sm text-muted">
        {s.year}
        {s.live && ` · live season, ranked as of ${fmtYmd(s.dataAsOf)}`}
      </p>
      <PlayerLine season={s} />

      <ul className="mt-4 divide-y divide-line/70">
        {score.badges.map((b) => (
          <BadgeRow key={b.id} badge={b} />
        ))}
      </ul>

      <ScoreTotals base={score.base} multiplier={score.multiplier} total={score.total} />
    </section>
  );
}
