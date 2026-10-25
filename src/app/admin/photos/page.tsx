import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { buttonClass, Card, PageTitle, SectionTitle } from "@/components/ui";
import { isAdmin } from "@/lib/admin";
import { getViewer } from "@/lib/auth/viewer";
import { findPlayer } from "@/lib/data/seasons";
import { fmtDate } from "@/lib/format";
import { photoPage } from "@/lib/photos-types";
import { getSeasonPhoto } from "@/lib/season-photo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

import { reviewPhoto } from "../../photos/actions";
import { StatusStamp } from "../../photos/status";

export const metadata: Metadata = { title: "Photo suggestions · Acedle", robots: { index: false } };

type Submission = Tables<"photo_submissions">;

export default function AdminPhotosPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageTitle subtitle="Check each photo is of the right player, then approve it for the card.">
        Photo suggestions
      </PageTitle>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-surface-2" />}>
        <Review />
      </Suspense>
    </main>
  );
}

async function Review() {
  const viewer = await getViewer();
  if (!viewer.isAccount || !(await isAdmin(viewer.userId))) notFound();

  const db = createAdminClient();
  const [pending, reviewed] = await Promise.all([
    db.from("photo_submissions").select("*").eq("status", "pending").order("created_at").limit(50),
    db
      .from("photo_submissions")
      .select("*")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(20),
  ]);
  if (pending.error || reviewed.error) {
    return (
      <p className="mt-6 text-accent-text">
        Couldn&apos;t load suggestions: {(pending.error ?? reviewed.error)!.message}. Has the photo_submissions migration
        been applied?
      </p>
    );
  }
  const userIds = [...new Set([...pending.data, ...reviewed.data].map((s) => s.submitted_by).filter((id) => id !== null))];
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("user_id, handle").in("user_id", userIds)
    : { data: [] };
  const handles = new Map((profiles ?? []).map((p) => [p.user_id, p.handle]));

  return (
    <>
      <SectionTitle className="mt-8">Waiting for review ({pending.data.length})</SectionTitle>
      {pending.data.length === 0 && <p className="mt-3 text-muted">Nothing to review.</p>}
      <ul className="mt-4 flex flex-col gap-4">
        {pending.data.map((s) => (
          <li key={s.id}>
            <Suggestion submission={s} handle={handles.get(s.submitted_by ?? "")} />
          </li>
        ))}
      </ul>

      <SectionTitle className="mt-10">Recently reviewed</SectionTitle>
      {reviewed.data.length === 0 && <p className="mt-3 text-muted">None yet.</p>}
      <ul className="mt-4 flex flex-col gap-4">
        {reviewed.data.map((s) => (
          <li key={s.id}>
            <Suggestion submission={s} handle={handles.get(s.submitted_by ?? "")} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** One suggestion next to the photo its card shows now, with the review buttons. */
async function Suggestion({ submission: s, handle }: { submission: Submission; handle?: string }) {
  const player = findPlayer(s.player_id);
  const current = s.year ? await getSeasonPhoto(s.player_id, s.year) : null;
  const decide = (decision: "approved" | "rejected", label: string, variant: "primary" | "secondary") => (
    <form action={reviewPhoto}>
      <input type="hidden" name="id" value={s.id} />
      <input type="hidden" name="decision" value={decision} />
      <button className={buttonClass({ variant, size: "sm" })}>{label}</button>
    </form>
  );
  return (
    <Card className="flex flex-col gap-4 sm:flex-row">
      <div className="flex shrink-0 gap-3">
        <figure>
          <a href={photoPage(s)} target="_blank" rel="noreferrer">
            <Image
              src={s.thumb}
              alt={`Suggested photo of ${player?.name ?? "the player"}`}
              width={128}
              height={160}
              unoptimized
              className="h-40 w-32 rounded-md border-2 border-fg object-cover"
            />
          </a>
          <figcaption className="mt-1 text-[10px] text-subtle uppercase">Suggested</figcaption>
        </figure>
        {s.year && (
          <figure>
            {current ? (
              <Image
                src={current.thumb}
                alt="The card's photo now"
                width={96}
                height={120}
                unoptimized
                className="h-30 w-24 rounded-md border-2 border-line object-cover opacity-80"
              />
            ) : (
              <div className="grid h-30 w-24 place-items-center rounded-md border-2 border-dashed border-line text-[10px] text-subtle uppercase">
                No photo
              </div>
            )}
            <figcaption className="mt-1 text-[10px] text-subtle uppercase">Now</figcaption>
          </figure>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-lg leading-tight uppercase">{player?.name ?? `Player ${s.player_id}`}</p>
          <StatusStamp status={s.status} />
        </div>
        <p className="text-muted">
          For {s.year ? `the ${s.year} season` : "all seasons"} · photo from {s.photo_year ?? "an unknown year"}
        </p>
        <p className="truncate">
          <a href={photoPage(s)} target="_blank" rel="noreferrer" className="underline">
            {s.file}
          </a>
        </p>
        <p className="text-muted">
          {s.author} · {s.license}
        </p>
        {s.note && <p className="mt-1 rounded-md bg-surface-2 px-2 py-1">&ldquo;{s.note}&rdquo;</p>}
        <p className="text-xs text-subtle">
          By {handle ?? "a deleted account"} · {fmtDate(s.created_at.slice(0, 10))}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {s.status !== "approved" && decide("approved", "Approve", "primary")}
          {s.status !== "rejected" && decide("rejected", s.status === "approved" ? "Take down" : "Reject", "secondary")}
        </div>
      </div>
    </Card>
  );
}
