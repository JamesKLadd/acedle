import Image from "next/image";
import Link from "next/link";

import type { PlayerSeason } from "@/lib/data/types";
import { photoPage, type SeasonPhoto } from "@/lib/photos-types";

import { Wordmark } from "./brand";
import { PlayerArt } from "./player-art";

/** What the card needs to know about the season. */
export type CardSeason = Pick<PlayerSeason, "playerId" | "name" | "year" | "hand" | "country">;

/** The back of a card: blue stripes and the maker's mark. Shown before the reveal flips it. */
export function CardBack() {
  return (
    <div className="grid size-full place-items-center bg-blue bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(255_255_255/0.07)_10px_20px)]">
      <div className="flex flex-col items-center gap-2">
        <span className="scale-75 sm:scale-125">
          <Wordmark />
        </span>
        <span className="mt-1 text-[8px] font-bold tracking-[0.2em] text-panel-fg/70 uppercase sm:mt-2 sm:text-[10px] sm:tracking-[0.3em]">1990 – 2026</span>
      </div>
    </div>
  );
}

/** For players without a photo: a pictogram in their colors, stamped with the season. */
function DefaultArt({ season }: { season: CardSeason }) {
  return (
    <div className="relative size-full bg-surface-2 bg-[radial-gradient(var(--line)_1.4px,transparent_1.6px)] bg-[length:9px_9px]">
      <PlayerArt hand={season.hand} country={season.country} className="size-full" />
      <span className="absolute bottom-1 left-1 -rotate-6 rounded-[3px] border-2 border-fg bg-surface px-1 font-display text-xs leading-tight text-accent sm:bottom-2 sm:left-2 sm:px-1.5 sm:text-lg">
        &rsquo;{String(season.year).slice(2)}
      </span>
      <span className="absolute right-1 bottom-1 rounded-[3px] border border-fg/40 bg-surface px-1 text-[9px] font-bold tracking-wider whitespace-nowrap text-muted uppercase sm:right-2 sm:bottom-2.5 sm:px-1.5 sm:text-[10px]">
        No photo<span className="hidden sm:inline"> on file</span>
      </span>
    </div>
  );
}

/**
 * A card's photo window: the season's photo (or default art) with a
 * facsimile autograph, its credit underneath. `back` shows the card's back
 * instead; switching it off flips the card over (the reveal does this).
 */
export function CardPhoto({
  photo,
  season,
  back = false,
  suggest = true,
  className = "",
}: {
  photo: SeasonPhoto | null;
  season: CardSeason;
  back?: boolean;
  /** Link to suggesting a (better) photo under the card. */
  suggest?: boolean;
  className?: string;
}) {
  const face = "absolute inset-0 overflow-hidden rounded-md border-2 border-fg [backface-visibility:hidden]";
  return (
    <figure className={className}>
      <div className="relative aspect-[4/5] [perspective:1200px]">
        <div
          className={`relative size-full transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
            back ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className={`${face} bg-surface-2`}>
            {photo ? (
              <Image
                src={photo.thumb}
                alt={`${season.name}${photo.year ? `, ${photo.year}` : ""}`}
                fill
                unoptimized
                sizes="(min-width: 640px) 13rem, 7.5rem"
                className="object-cover"
                style={{ objectPosition: "50% 22%" }}
              />
            ) : (
              <DefaultArt season={season} />
            )}
            {photo && (
              <span
                aria-hidden
                className="absolute right-1.5 bottom-0.5 -rotate-6 font-script text-sm leading-tight text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)] sm:right-2 sm:bottom-1 sm:text-2xl"
              >
                {season.name}
              </span>
            )}
          </div>
          <div className={`${face} [transform:rotateY(180deg)]`}>
            <CardBack />
          </div>
        </div>
      </div>
      {!back && (photo || suggest) && (
        <figcaption className="mt-1 text-[10px] leading-tight text-subtle">
          {photo && (
            <span className="block truncate">
              {photo.sameSeason || !photo.year ? "Photo" : `Photo from ${photo.year}`}:{" "}
              <a href={photoPage(photo)} target="_blank" rel="noreferrer" className="underline hover:text-fg">
                {photo.author}
              </a>
              , {photo.license}
            </span>
          )}
          {suggest && (
            <Link
              href={`/photos/suggest/${season.playerId}/${season.year}`}
              className="mt-0.5 inline-block font-semibold underline hover:text-fg"
            >
              {photo ? "Better photo?" : "Suggest a photo"}
            </Link>
          )}
        </figcaption>
      )}
    </figure>
  );
}
