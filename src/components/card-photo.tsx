import Image from "next/image";

import { photoPage, type SeasonPhoto } from "@/lib/photos-types";

import { Wordmark } from "./brand";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The back of a card: blue stripes and the maker's mark. Shown before the reveal flips it. */
export function CardBack() {
  return (
    <div className="grid size-full place-items-center bg-blue bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(255_255_255/0.07)_10px_20px)]">
      <div className="flex flex-col items-center gap-2">
        <span className="scale-125">
          <Wordmark />
        </span>
        <span className="mt-2 text-[10px] font-bold tracking-[0.3em] text-panel-fg/70 uppercase">1990 – 2026</span>
      </div>
    </div>
  );
}

/** For players without a photo on Commons: their initials on a halftone print. */
function DefaultArt({ name }: { name: string }) {
  return (
    <div className="relative grid size-full place-items-center bg-surface-2 bg-[radial-gradient(var(--line)_1.4px,transparent_1.6px)] bg-[length:9px_9px]">
      <span className="font-display text-7xl text-blue [text-shadow:4px_4px_0_var(--accent-soft)]">
        {initials(name)}
      </span>
      <span className="absolute bottom-2 rounded-[3px] border border-line bg-surface px-1.5 text-[10px] font-bold tracking-wider text-subtle uppercase">
        No photo on file
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
  name,
  back = false,
  className = "",
}: {
  photo: SeasonPhoto | null;
  name: string;
  back?: boolean;
  className?: string;
}) {
  const face = "absolute inset-0 overflow-hidden rounded-md border-2 border-fg [backface-visibility:hidden]";
  return (
    <figure className={className}>
      <div className="relative aspect-[4/3] [perspective:1200px] sm:aspect-[4/5]">
        <div
          className={`relative size-full transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none ${
            back ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className={`${face} bg-surface-2`}>
            {photo ? (
              <Image
                src={photo.thumb}
                alt={`${name}${photo.year ? `, ${photo.year}` : ""}`}
                fill
                unoptimized
                sizes="(min-width: 640px) 13rem, 100vw"
                className="object-cover"
                style={{ objectPosition: "50% 22%" }}
              />
            ) : (
              <DefaultArt name={name} />
            )}
            {photo && (
              <span
                aria-hidden
                className="absolute right-2 bottom-1 -rotate-6 font-script text-2xl text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]"
              >
                {name}
              </span>
            )}
          </div>
          <div className={`${face} [transform:rotateY(180deg)]`}>
            <CardBack />
          </div>
        </div>
      </div>
      {photo && !back && (
        <figcaption className="mt-1 truncate text-[10px] leading-tight text-subtle">
          {photo.sameSeason || !photo.year ? "Photo" : `Photo from ${photo.year}`}:{" "}
          <a href={photoPage(photo)} target="_blank" rel="noreferrer" className="underline hover:text-fg">
            {photo.author}
          </a>
          , {photo.license}
        </figcaption>
      )}
    </figure>
  );
}
