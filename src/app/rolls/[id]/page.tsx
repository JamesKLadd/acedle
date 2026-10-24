import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RollCard } from "@/components/roll-card";
import { ShareButton } from "@/components/share-button";
import { getViewer } from "@/lib/auth/viewer";
import { fmtDay, fmtScore } from "@/lib/format";
import { getSharedRoll } from "@/lib/roll/shared";
import { topPercent } from "@/lib/scoring/distribution";
import { shareText } from "@/lib/share";

const linkClass = "font-medium text-accent-text underline decoration-2 underline-offset-4";

export async function generateMetadata({ params }: PageProps<"/rolls/[id]">): Promise<Metadata> {
  const shared = await getSharedRoll((await params).id);
  if (!shared) return { title: "Roll not found · Acedle" };
  const { season: s, score } = shared.roll;
  const title = `${s.year} ${s.name} · ${fmtScore(score.total)} points`;
  const description = `${shared.handle ?? "A guest"} rolled ${s.year} ${s.name} (#${s.ranking.final}) on Acedle.`;
  return { title: `${title} · Acedle`, description, openGraph: { title, description } };
}

export default function RollPage({ params }: PageProps<"/rolls/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface-2" />}>
        <RollDetail params={params} />
      </Suspense>
    </main>
  );
}

/** Anyone with the link can see a roll; its owner also gets the share button. */
async function RollDetail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, viewer] = await Promise.all([params, getViewer()]);
  const shared = await getSharedRoll(id);
  if (!shared) notFound();
  const { roll, handle } = shared;
  const isOwner = viewer.userId === shared.ownerId;

  return (
    <>
      {isOwner ? (
        <Link href="/profile" className="text-sm text-muted hover:text-fg">
          ← Roll history
        </Link>
      ) : (
        <p className="text-sm text-muted">
          Rolled by <strong className="text-fg">{handle ?? "a guest"}</strong>
        </p>
      )}
      <h1 className="mt-4 mb-3 text-sm font-medium tracking-wide text-muted uppercase">
        {fmtDay(roll.day)}, {roll.day.slice(0, 4)}
      </h1>
      <RollCard season={roll.season} score={roll.score} topPercent={topPercent(roll.score.total)} />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {isOwner ? (
          <ShareButton
            text={shareText({ ...roll, topPercent: topPercent(roll.score.total) })}
            path={`/rolls/${roll.id}`}
          />
        ) : (
          <Link href="/" className={linkClass}>
            Roll your own season →
          </Link>
        )}
      </div>
    </>
  );
}
