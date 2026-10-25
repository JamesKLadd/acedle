import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Tournament } from "@/components/tournament/tournament";
import { Card, PageTitle } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { getSharedRoll } from "@/lib/roll/shared";
import { getTournament } from "@/lib/tournament-store";

import { DailyTournament } from "./daily-tournament";

export const metadata: Metadata = { title: "Tournament · Acedle" };

export default function TournamentPage({ params }: PageProps<"/rolls/[id]/tournament">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-2" />}>
        <TournamentDetail params={params} />
      </Suspense>
    </main>
  );
}

/** The owner plays (or resumes) the roll's tournament; anyone else sees how it went. */
async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  const shared = await getSharedRoll(id);
  if (!shared) notFound();
  const tournament = await getTournament(id);
  const { season: s } = shared.roll;
  const isOwner = viewer.userId === shared.ownerId;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/rolls/${id}`} className="text-sm text-muted hover:text-fg">
        ← {s.year} {s.name}
      </Link>
      <PageTitle subtitle={isOwner ? undefined : `${shared.handle ?? "A guest"}'s run with ${s.year} ${s.name}`}>
        Tournament
      </PageTitle>
      {isOwner ? (
        <DailyTournament rollId={id} playerName={`${s.year} ${s.name}`} initial={tournament} />
      ) : tournament ? (
        <Tournament setup={tournament.setup} initialSets={tournament.sets} readOnly />
      ) : (
        <Card>
          <p className="text-muted">This roll hasn&apos;t been taken into a tournament yet.</p>
        </Card>
      )}
    </div>
  );
}
