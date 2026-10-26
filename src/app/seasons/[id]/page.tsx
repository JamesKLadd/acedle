import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CardPhoto } from "@/components/card-photo";
import { SeasonPlay } from "@/components/season/season-play";
import { getViewer } from "@/lib/auth/viewer";
import { getSharedRoll } from "@/lib/roll/shared";
import { getSeason } from "@/lib/season/store";
import { getSeasonPhoto } from "@/lib/season-photo";

export async function generateMetadata({ params }: PageProps<"/seasons/[id]">): Promise<Metadata> {
  const season = await getSeason((await params).id);
  if (!season) return { title: "Season not found · Acedle" };
  const { you } = season.setup;
  const title = `${you.year} ${you.name}'s season`;
  const description = `${season.wins}–${season.losses}, ${season.titles} ${season.titles === 1 ? "title" : "titles"}, ${season.points.toLocaleString("en-US")} points on Acedle.`;
  return { title: `${title} · Acedle`, description, openGraph: { title, description } };
}

export default function SeasonPage({ params }: PageProps<"/seasons/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-2" />}>
        <SeasonDetail params={params} />
      </Suspense>
    </main>
  );
}

/** Anyone with the link can see a season; its owner plays it. */
async function SeasonDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  const season = await getSeason(id);
  if (!season) notFound();
  const shared = await getSharedRoll(season.rollId);
  if (!shared) notFound();
  const card = shared.roll.season;
  const isOwner = viewer.userId === shared.ownerId;
  const photo = await getSeasonPhoto(card.playerId, card.year);

  return (
    <div className="flex flex-col gap-4">
      {isOwner ? (
        <Link href={`/rolls/${season.rollId}`} className="text-sm text-muted hover:text-fg">
          ← {card.year} {card.name}
        </Link>
      ) : (
        <p className="text-sm text-muted">
          A season by <strong className="text-fg">{shared.handle ?? "a guest"}</strong>
        </p>
      )}
      <SeasonPlay
        key={season.id}
        season={season}
        readOnly={!isOwner}
        card={<CardPhoto photo={photo} season={card} suggest={false} />}
      />
    </div>
  );
}
