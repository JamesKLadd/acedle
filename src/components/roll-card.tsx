// The roll card and the parts the reveal animation reuses. No hooks, so it
// renders on the server too.

import { Crown, Sparkles } from "lucide-react";
import type { ReactNode, Ref } from "react";

import type { PlayerSeason } from "@/lib/data/types";
import { flag } from "@/lib/flags";
import { fmtMult, fmtScore, fmtTopPercent, fmtYmd } from "@/lib/format";
import { isSpecial, rankTier, rarityOf, RARITY_TEXT, type Rarity } from "@/lib/rarity";
import { badgeSections } from "@/lib/reveal";
import type { BadgeCategory, EarnedBadge, ScoreResult } from "@/lib/scoring/types";

import { Chip } from "./ui";

export const CATEGORY_STYLES: Record<BadgeCategory, string> = {
  titles: "bg-cat-titles/15 text-cat-titles",
  surface: "bg-cat-surface/15 text-cat-surface",
  ranking: "bg-cat-ranking/15 text-cat-ranking",
  matches: "bg-cat-matches/15 text-cat-matches",
  serve: "bg-cat-serve/15 text-cat-serve",
  profile: "bg-cat-profile/15 text-cat-profile",
  jackpot: "bg-cat-jackpot/15 text-cat-jackpot",
};

const FRAME_BORDER: Record<Rarity, string> = {
  common: "border-line",
  rare: "border-rare/70",
  epic: "border-epic/70",
  legendary: "border-transparent",
  mythic: "border-transparent",
};

const SHINE: Record<"legendary" | "mythic", string> = {
  legendary:
    "conic-gradient(from var(--shine-angle), var(--legendary), #fff6d5, var(--legendary), #b07d09, var(--legendary))",
  mythic: "conic-gradient(from var(--shine-angle), var(--mythic), var(--epic), var(--rare), var(--accent), var(--mythic))",
};

/**
 * The card's outline, colored by rarity. Legendary and mythic rolls get an
 * animated shining border. `rarity` null keeps the plain outline (mid-reveal).
 */
export function RarityFrame({ rarity, children }: { rarity: Rarity | null; children: ReactNode }) {
  const special = rarity !== null && isSpecial(rarity);
  return (
    <div
      className={`rounded-[18px] p-[2px] ${special ? "animate-shine" : ""}`}
      style={special ? { background: SHINE[rarity as "legendary" | "mythic"] } : undefined}
    >
      <section
        className={`relative rounded-2xl border-2 bg-surface p-5 shadow-sm transition-colors duration-500 sm:p-6 ${
          rarity ? FRAME_BORDER[rarity] : "border-line"
        }`}
      >
        {children}
      </section>
    </div>
  );
}

export function RarityChip({ topPercent, className = "" }: { topPercent: number; className?: string }) {
  const r = rarityOf(topPercent);
  return (
    <Chip className={`shrink-0 border border-current/30 bg-current/10 tracking-wide uppercase ${RARITY_TEXT[r.id]} ${className}`}>
      {isSpecial(r.id) && <Sparkles className="size-3" aria-hidden />}
      {r.label} · {fmtTopPercent(topPercent)}
    </Chip>
  );
}

export function TierChip({ finalRank, className = "" }: { finalRank: number; className?: string }) {
  const tier = rankTier(finalRank);
  if (!tier) return null;
  return (
    <Chip className={`bg-current/10 uppercase ${RARITY_TEXT[tier.rarity]} ${className}`}>
      {finalRank === 1 && <Crown className="size-3" aria-hidden />}
      {tier.label}
    </Chip>
  );
}

/** The season year in the display face, plus the live-season note. */
export function SeasonLabel({ season: s, year }: { season: PlayerSeason; year?: ReactNode }) {
  return (
    <span className="font-display text-lg font-bold tracking-wider text-accent-text">
      {year ?? s.year}
      {s.live && year === undefined && (
        <span className="block font-sans text-xs font-medium tracking-normal text-muted sm:ml-2 sm:inline sm:align-middle">
          live season · ranked as of {fmtYmd(s.dataAsOf)}
        </span>
      )}
    </span>
  );
}

/** Rank, country, record and titles under the player's name. */
export function PlayerFacts({ season: s, tierClass }: { season: PlayerSeason; tierClass?: string }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      <span className="font-semibold text-fg">#{s.ranking.final}</span>
      <span aria-hidden>·</span>
      <span>
        <span className="mr-1" aria-hidden>
          {flag(s.country)}
        </span>
        {s.country}
      </span>
      <span aria-hidden>·</span>
      <span className="tabular">
        {s.matches.wins}–{s.matches.losses}
      </span>
      <span aria-hidden>·</span>
      <span>
        {s.titles.length} {s.titles.length === 1 ? "title" : "titles"}
      </span>
      <TierChip finalRank={s.ranking.final} className={tierClass} />
    </p>
  );
}

export function PlayerName({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-3xl leading-tight font-bold uppercase sm:text-4xl">{children}</h2>;
}

export function BadgeRow({ badge, className = "" }: { badge: EarnedBadge; className?: string }) {
  const isMult = badge.multiplier !== null;
  return (
    <li data-flip={badge.id} className={`flex items-center gap-3 py-2.5 ${className}`}>
      <span
        className={`w-20 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tracking-wide uppercase ${CATEGORY_STYLES[badge.category]}`}
      >
        {badge.category}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{badge.name}</span>
        <span className="block truncate text-sm text-muted">{badge.detail}</span>
      </span>
      <span
        className={`tabular shrink-0 font-mono font-semibold ${isMult ? "rounded-md bg-accent px-2 py-0.5 text-accent-ink" : ""}`}
      >
        {isMult ? fmtMult(badge.multiplier!) : `+${fmtScore(badge.points)}`}
      </span>
    </li>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-subtle uppercase">{children}</p>;
}

/** Multipliers, then points, each biggest first. */
export function BadgeSections({
  badges,
  rowClass,
  listRef,
}: {
  badges: readonly EarnedBadge[];
  /** Class for each row (the reveal animates new ones in). */
  rowClass?: string;
  listRef?: Ref<HTMLDivElement>;
}) {
  const { multipliers, points } = badgeSections(badges);
  return (
    <div ref={listRef} className="relative mt-5 flex flex-col gap-4 empty:mt-0">
      {multipliers.length > 0 && (
        <div data-flip="section-multipliers">
          <SectionLabel>Multipliers</SectionLabel>
          <ul className="divide-y divide-line/70">
            {multipliers.map((b) => (
              <BadgeRow key={b.id} badge={b} className={rowClass} />
            ))}
          </ul>
        </div>
      )}
      {points.length > 0 && (
        <div data-flip="section-points">
          <SectionLabel>Points</SectionLabel>
          <ul className="divide-y divide-line/70">
            {points.map((b) => (
              <BadgeRow key={b.id} badge={b} className={rowClass} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The base × multiplier = score panel, styled like a scoreboard. */
export function Scoreboard({
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
  const label = "text-[10px] font-semibold tracking-[0.18em] text-panel-fg/60 uppercase";
  return (
    // Phones: base × mult on one line, the score on its own line below (a
    // great season's score is 11 characters). From sm up, all on one line.
    <dl className="mt-5 flex flex-col gap-2 rounded-xl bg-panel px-4 py-3 text-panel-fg sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-4">
        <div>
          <dt className={label}>Base</dt>
          <dd className="tabular font-mono text-lg">{fmtScore(base)}</dd>
        </div>
        <span className="text-panel-fg/40" aria-hidden>
          ×
        </span>
        <div>
          <dt className={label}>Mult</dt>
          <dd className="tabular font-mono text-lg">{fmtMult(multiplier).slice(1)}</dd>
        </div>
      </div>
      <span className="ml-auto hidden h-10 w-px shrink-0 bg-panel-fg/15 sm:block" aria-hidden />
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 border-t border-panel-fg/15 pt-2 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <dt className={label}>Score</dt>
        <dd
          data-score
          className={`tabular min-w-0 font-mono text-2xl font-bold break-all transition-[color,text-shadow] duration-500 sm:text-3xl ${
            final ? "text-[#d4f53c] [text-shadow:0_0_18px_rgb(212_245_60/0.45)]" : ""
          }`}
        >
          {fmtScore(total)}
        </dd>
      </div>
    </dl>
  );
}

/** A rolled player-season with its badges and score. */
export function RollCard({
  season: s,
  score,
  topPercent,
}: {
  season: PlayerSeason;
  score: ScoreResult;
  /** Share of all seasons scoring at least this much; shows the rarity. */
  topPercent?: number;
}) {
  return (
    <RarityFrame rarity={topPercent === undefined ? null : rarityOf(topPercent).id}>
      <div className="flex items-start justify-between gap-3">
        <SeasonLabel season={s} />
        {topPercent !== undefined && <RarityChip topPercent={topPercent} />}
      </div>
      <PlayerName>{s.name}</PlayerName>
      <PlayerFacts season={s} />
      <Scoreboard base={score.base} multiplier={score.multiplier} total={score.total} />
      <BadgeSections badges={score.badges} />
    </RarityFrame>
  );
}
