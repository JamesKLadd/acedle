import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { CardPhoto } from "@/components/card-photo";
import { Card, FitText, linkClass, PageTitle, SectionTitle } from "@/components/ui";
import { getAuthSettings } from "@/lib/auth/settings";
import { getViewer } from "@/lib/auth/viewer";
import { findPlayer, findSeason } from "@/lib/data/seasons";
import { photoPage } from "@/lib/photos-types";
import { getSeasonPhoto } from "@/lib/season-photo";

import { SignInButtons } from "../../../../sign-in-buttons";
import { StatusStamp } from "../../../status";
import { SuggestForm } from "./suggest-form";

export const metadata: Metadata = {
  title: "Suggest a photo · Acedle",
  description: "Know a freely licensed photo of a player? Suggest it for their Acedle card.",
};

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={linkClass} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function SuggestPhotoPage({ params }: PageProps<"/photos/suggest/[player]/[year]">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <PageTitle subtitle="Help put a face on every card.">Suggest a photo</PageTitle>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-surface-2" />}>
        <Suggest params={params} />
      </Suspense>
    </main>
  );
}

async function Suggest({ params }: { params: Promise<{ player: string; year: string }> }) {
  const { player, year } = await params;
  const season = findSeason(Number(year), Number(player));
  if (!season) notFound();
  const [viewer, photo, settings] = await Promise.all([
    getViewer(),
    getSeasonPhoto(season.playerId, season.year),
    getAuthSettings().catch(() => ({ guests: false, providers: [] })),
  ]);
  const search = new URLSearchParams({ search: `${season.name} tennis`, type: "image", title: "Special:MediaSearch" });

  return (
    <>
      <Card className="mt-6">
        <div className="grid grid-cols-[7.5rem_1fr] gap-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
          <CardPhoto photo={photo} season={season} suggest={false} />
          <div className="min-w-0">
            <p className="font-display text-2xl text-accent">{season.year}</p>
            <FitText
              text={season.name}
              className="font-display leading-tight break-words uppercase [font-size:min(1.25rem,var(--fit))] sm:[font-size:min(1.5rem,var(--fit))]"
            />
            <p className="mt-2 text-sm text-muted">
              {photo
                ? photo.sameSeason
                  ? "This card has a photo from the season. Know a better one?"
                  : `This card uses a photo from ${photo.year ?? "another year"}. Know one from ${season.year}?`
                : "This card has no photo yet."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <SectionTitle>How it works</SectionTitle>
        <div className="mt-3 flex flex-col gap-3 text-sm text-fg/85">
          <p>
            Card photos come from <A href="https://commons.wikimedia.org/">Wikimedia Commons</A>, where every photo is
            free to use with credit. Find one of {season.name} there (
            <A href={`https://commons.wikimedia.org/w/index.php?${search}`}>search Commons</A>) and paste the link to its
            page. Photos from {season.year}, on court, celebrating, make the best cards.
          </p>
          <p>
            Took a photo yourself? <A href="https://commons.wikimedia.org/wiki/Special:UploadWizard">Upload it to
            Commons</A> under a free license first, then suggest it here. Photos from news agencies or other websites
            can&apos;t be used.
          </p>
          <p>Each suggestion is checked before it goes on the card.</p>
        </div>
      </Card>

      <Card className="mt-6">
        <SectionTitle>Your suggestion</SectionTitle>
        <div className="mt-4">
          {viewer.isAccount ? (
            <SuggestForm playerId={season.playerId} year={season.year} name={season.name} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Sign in to suggest photos{viewer.isGuest ? " (your guest rolls move to your new account)" : ""}.
              </p>
              {settings.providers.length > 0 && <SignInButtons providers={settings.providers} />}
            </div>
          )}
        </div>
      </Card>

      {viewer.isAccount && <MySuggestions viewer={viewer} />}

      <p className="mt-6 text-sm">
        <Link href="/" className={linkClass}>
          Back to today&apos;s roll
        </Link>
      </p>
    </>
  );
}

/** The signed-in account's latest suggestions and how their review went. */
async function MySuggestions({ viewer }: { viewer: Awaited<ReturnType<typeof getViewer>> }) {
  const { data } = await viewer.supabase
    .from("photo_submissions")
    .select("id, player_id, year, file, thumb, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data?.length) return null;
  return (
    <Card className="mt-6">
      <SectionTitle>Your recent suggestions</SectionTitle>
      <ul className="mt-4 flex flex-col gap-3">
        {data.map((s) => {
          const name = findPlayer(s.player_id)?.name;
          return (
            <li key={s.id} className="flex items-center gap-3">
              <Image
                src={s.thumb}
                alt=""
                width={40}
                height={50}
                unoptimized
                className="h-[50px] w-10 shrink-0 rounded-sm border-2 border-fg object-cover"
              />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">
                  {name ?? "Player"} · {s.year ?? "all seasons"}
                </p>
                <a href={photoPage(s)} target="_blank" rel="noreferrer" className="block truncate text-xs text-muted underline">
                  {s.file}
                </a>
              </div>
              <StatusStamp status={s.status} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
