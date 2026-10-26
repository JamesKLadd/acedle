import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RollCard } from "@/components/roll-card";
import { SeasonLink } from "@/components/season/season-link";
import { ShareButton } from "@/components/share-button";
import { TournamentLink } from "@/components/tournament/tournament-link";
import { buttonClass } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { fmtDay, fmtScore } from "@/lib/format";
import { getSeasonPhoto } from "@/lib/season-photo";
import { getSharedRoll } from "@/lib/roll/shared";
import { topPercent } from "@/lib/scoring/distribution";
import { shareText } from "@/lib/share";
import { getTournament, runResult } from "@/lib/tournament-store";

export async function generateMetadata({ params }: PageProps<"/rolls/[id]">): Promise<Metadata> {
  const shared = await getSharedRoll((await params).id);
  if (!shared) return { title: "Roll not found · Acedle" };
  const { season: s, score } = shared.roll;
  const title = `${s.year} ${s.name} · ${fmtScore(score.total)} points`;
  const description = `${shared.handle ?? "A guest"} rolled ${s.year} ${s.name} (#${s.ranking.final}) on Acedle.`;
  return { title: `${title} · Acedle`, description, openGraph: { title, description } };
}

export default function RollPage({ params, searchParams }: PageProps<"/rolls/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-surface-2" />}>
        <RollDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Anyone with the link can see a roll; its owner also gets the share button. */
async function RollDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, { from }, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const [shared, tournament] = await Promise.all([getSharedRoll(id), getTournament(id)]);
  if (!shared) notFound();
  const { roll, handle } = shared;
  const isOwner = viewer.userId === shared.ownerId;

  return (
    <>
      {isOwner ? (
        <Link href={from === "dex" ? "/profile/dex" : "/profile"} className="text-sm text-muted hover:text-fg">
          ← {from === "dex" ? "Player-dex" : "Roll history"}
        </Link>
      ) : (
        <p className="text-sm text-muted">
          Rolled by <strong className="text-fg">{handle ?? "a guest"}</strong>
        </p>
      )}
      <h1 className="mt-4 mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        {fmtDay(roll.day)}, {roll.day.slice(0, 4)}
      </h1>
      <RollCard
        season={roll.season}
        score={roll.score}
        topPercent={topPercent(roll.score.total)}
        photo={await getSeasonPhoto(roll.season.playerId, roll.season.year)}
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {isOwner ? (
          <ShareButton
            text={shareText({ ...roll, topPercent: topPercent(roll.score.total), tournament: runResult(tournament) })}
            path={`/rolls/${roll.id}`}
          />
        ) : (
          <Link href="/" className={buttonClass()}>
            Roll your own season
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <TournamentLink rollId={roll.id} tournament={tournament} isOwner={isOwner} />
        <SeasonLink rollId={roll.id} ownerId={shared.ownerId} isOwner={isOwner} />
      </div>
    </>
  );
}
