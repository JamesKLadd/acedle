// The roll card and the parts the reveal animation reuses. No hooks, so it
// renders on the server too.

import { Crown, Sparkles } from "lucide-react";
import type { ReactNode, Ref } from "react";

import type { PlayerSeason } from "@/lib/data/types";
import type { SeasonPhoto } from "@/lib/photos-types";
import { flag } from "@/lib/flags";
import { fmtMult, fmtScore, fmtTopPercent, fmtYmd } from "@/lib/format";
import { isSpecial, rankTier, rarityOf, RARITY_TEXT, type Rarity } from "@/lib/rarity";
import { badgeSections } from "@/lib/reveal";
import type { BadgeCategory, EarnedBadge, ScoreResult } from "@/lib/scoring/types";

import { CardPhoto } from "./card-photo";
import { Chip } from "./ui";

/** Badge categories as rubber stamps: outlined in the category's color. */
export const CATEGORY_STYLES: Record<BadgeCategory, string> = {
  titles: "border-cat-titles text-cat-titles",
  surface: "border-cat-surface text-cat-surface",
  ranking: "border-cat-ranking text-cat-ranking",
  matches: "border-cat-matches text-cat-matches",
  serve: "border-cat-serve text-cat-serve",
  profile: "border-cat-profile text-cat-profile",
  jackpot: "border-cat-jackpot text-cat-jackpot",
};

/** The card's printed border, by rarity (legendary and mythic get foil). */
const FRAME: Record<Rarity, string> = {
  common: "var(--blue)",
  rare: "var(--rare)",
  epic: "var(--epic)",
  legendary: "var(--legendary)",
  mythic: "var(--mythic)",
};

const SHINE: Record<"legendary" | "mythic", string> = {
  legendary:
    "conic-gradient(from var(--shine-angle), var(--legendary), #fff6d5, var(--legendary), #b07d09, var(--legendary))",
  mythic: "conic-gradient(from var(--shine-angle), var(--mythic), var(--epic), var(--rare), var(--accent), var(--mythic))",
};

/**
 * The card itself: card stock inside a thick printed border colored by
 * rarity. Legendary and mythic rolls get an animated foil border. `rarity`
 * null keeps the plain blue border (mid-reveal).
 */
export function RarityFrame({ rarity, children }: { rarity: Rarity | null; children: ReactNode }) {
  const special = rarity !== null && isSpecial(rarity);
  return (
    <div
      className={`rounded-xl border-2 border-fg p-[7px] shadow-[5px_5px_0_0_rgb(0_0_0/0.18)] transition-[background] duration-500 ${
        special ? "animate-shine" : ""
      }`}
      style={{ background: special ? SHINE[rarity as "legendary" | "mythic"] : FRAME[rarity ?? "common"] }}
    >
      <section className="relative rounded-md border-2 border-fg bg-surface p-4 sm:p-5">{children}</section>
    </div>
  );
}

export function RarityChip({ topPercent, className = "" }: { topPercent: number; className?: string }) {
  const r = rarityOf(topPercent);
  return (
    <Chip className={`shrink-0 border-2 border-current bg-surface text-[10px] tracking-wide uppercase sm:text-xs ${RARITY_TEXT[r.id]} ${className}`}>
      {isSpecial(r.id) && <Sparkles className="size-3" aria-hidden />}
      {r.label} · {fmtTopPercent(topPercent)}
    </Chip>
  );
}

export function TierChip({ finalRank, className = "" }: { finalRank: number; className?: string }) {
  const tier = rankTier(finalRank);
  if (!tier) return null;
  return (
    <Chip className={`border border-current uppercase ${RARITY_TEXT[tier.rarity]} ${className}`}>
      {finalRank === 1 && <Crown className="size-3" aria-hidden />}
      {tier.label}
    </Chip>
  );
}

/** The season year on a blue pennant, plus the live-season note. */
export function SeasonLabel({ season: s, year }: { season: PlayerSeason; year?: ReactNode }) {
  return (
    <span>
      <span className="inline-block -skew-x-6 rounded-[3px] bg-blue px-2 pt-0.5 font-display text-base leading-snug tracking-wider text-gold sm:text-lg">
        <span className="inline-block skew-x-6">{year ?? s.year}</span>
      </span>
      {s.live && year === undefined && (
        <span className="mt-1 block text-xs font-medium text-muted">live season · ranked as of {fmtYmd(s.dataAsOf)}</span>
      )}
    </span>
  );
}

/** Rank, country, record and titles under the player's name. */
export function PlayerFacts({ season: s, tierClass }: { season: PlayerSeason; tierClass?: string }) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted sm:text-sm">
      <span className="font-bold text-fg">#{s.ranking.final}</span>
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
  return <h2 className="mt-2 font-display text-xl leading-[1.05] break-words uppercase min-[400px]:text-2xl sm:text-4xl">{children}</h2>;
}

export function BadgeRow({ badge, className = "" }: { badge: EarnedBadge; className?: string }) {
  const isMult = badge.multiplier !== null;
  return (
    <li data-flip={badge.id} className={`flex items-center gap-3 py-2.5 ${className}`}>
      <span
        className={`w-20 shrink-0 -rotate-2 rounded-[3px] border-2 px-1 py-px text-center text-[10px] font-extrabold tracking-wider uppercase ${CATEGORY_STYLES[badge.category]}`}
      >
        {badge.category}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{badge.name}</span>
        <span className="block truncate text-sm text-muted">{badge.detail}</span>
      </span>
      <span
        className={`tabular shrink-0 font-mono font-bold ${isMult ? "rounded-[4px] border-2 border-fg bg-gold px-2 py-0.5 text-[#1f2233]" : ""}`}
      >
        {isMult ? fmtMult(badge.multiplier!) : `+${fmtScore(badge.points)}`}
      </span>
    </li>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-subtle uppercase after:h-0 after:flex-1 after:border-t-2 after:border-dotted after:border-line">
      {children}
    </p>
  );
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
          <ul className="divide-y divide-dashed divide-line">
            {multipliers.map((b) => (
              <BadgeRow key={b.id} badge={b} className={rowClass} />
            ))}
          </ul>
        </div>
      )}
      {points.length > 0 && (
        <div data-flip="section-points">
          <SectionLabel>Points</SectionLabel>
          <ul className="divide-y divide-dashed divide-line">
            {points.map((b) => (
              <BadgeRow key={b.id} badge={b} className={rowClass} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The base × multiplier = score panel: a blue box like a card's stat
 * block. Base × mult on one line, the score (up to 11 characters) below.
 */
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
  const label = "text-[10px] font-extrabold tracking-[0.18em] text-panel-fg/65 uppercase";
  return (
    <dl className="mt-4 flex flex-col gap-1.5 rounded-md border-2 border-fg bg-panel px-4 py-3 text-panel-fg">
      <div className="flex items-center gap-4">
        <div>
          <dt className={label}>Base</dt>
          <dd className="tabular font-mono text-lg font-bold">{fmtScore(base)}</dd>
        </div>
        <span className="text-panel-fg/50" aria-hidden>
          ×
        </span>
        <div>
          <dt className={label}>Mult</dt>
          <dd className="tabular font-mono text-lg font-bold">{fmtMult(multiplier).slice(1)}</dd>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 border-t-2 border-dotted border-panel-fg/25 pt-1.5">
        <dt className={label}>Score</dt>
        <dd
          data-score
          className={`tabular min-w-0 font-display text-2xl break-all transition-colors duration-500 min-[400px]:text-3xl ${
            final ? "text-gold [text-shadow:2px_2px_0_rgb(0_0_0/0.35)]" : ""
          }`}
        >
          {fmtScore(total)}
        </dd>
      </div>
    </dl>
  );
}

/**
 * The front of the card: photo window on the left (on top on phones), the
 * season, name, facts and scoreboard beside it. The reveal fills the slots
 * with its reels.
 */
export function CardFront({
  photo,
  label,
  chip,
  name,
  facts,
  scoreboard,
}: {
  photo: ReactNode;
  label: ReactNode;
  chip?: ReactNode;
  name: ReactNode;
  facts: ReactNode;
  scoreboard: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 sm:grid-cols-[13rem_1fr] sm:gap-x-5">
      <div className="sm:row-span-2">{photo}</div>
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          {label}
          {chip}
        </div>
        {name}
        {facts}
      </div>
      <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:mt-auto">{scoreboard}</div>
    </div>
  );
}

/** A rolled player-season as a trading card: photo, name, score and badges. */
export function RollCard({
  season: s,
  score,
  topPercent,
  photo,
}: {
  season: PlayerSeason;
  score: ScoreResult;
  /** Share of all seasons scoring at least this much; shows the rarity. */
  topPercent?: number;
  /** The season's photo; null shows the default card art. */
  photo: SeasonPhoto | null;
}) {
  return (
    <RarityFrame rarity={topPercent === undefined ? null : rarityOf(topPercent).id}>
      <CardFront
        photo={<CardPhoto photo={photo} season={s} />}
        label={<SeasonLabel season={s} />}
        chip={topPercent !== undefined && <RarityChip topPercent={topPercent} />}
        name={<PlayerName>{s.name}</PlayerName>}
        facts={<PlayerFacts season={s} />}
        scoreboard={<Scoreboard base={score.base} multiplier={score.multiplier} total={score.total} />}
      />
      <BadgeSections badges={score.badges} />
    </RarityFrame>
  );
}
