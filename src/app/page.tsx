import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CardBack } from "@/components/card-photo";

import { Today, TodaySkeleton } from "./today";

/** Three card backs fanned out, the front one waiting to be turned over. */
function FannedCards() {
  const card = "absolute top-0 left-1/2 h-40 w-28 overflow-hidden rounded-md border-2 border-fg shadow-[3px_3px_0_0_rgb(0_0_0/0.25)]";
  return (
    <div className="relative mx-auto h-44 w-48 shrink-0" aria-hidden>
      <div className={`${card} -ml-[5.5rem] origin-bottom -rotate-[14deg]`}>
        <CardBack />
      </div>
      <div className={`${card} -ml-[1.5rem] origin-bottom rotate-[14deg]`}>
        <CardBack />
      </div>
      <div className={`${card} -ml-14 -translate-y-1 grid place-items-center bg-surface`}>
        <span className="font-display text-6xl text-accent">?</span>
      </div>
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-8 pb-6">
      {/* Today's pack: a red wrapper with a crimped edge. */}
      <section className="relative overflow-hidden rounded-lg border-2 border-fg bg-accent text-accent-ink shadow-[5px_5px_0_0_var(--blue)]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold tracking-[0.25em] text-gold uppercase">Series 1990–2026 · one card a day</p>
            <h1 className="mt-2 font-display text-4xl leading-none uppercase [text-shadow:3px_3px_0_var(--blue)] sm:text-5xl">
              Roll today&apos;s card
            </h1>
            <p className="mt-3 max-w-sm text-sm text-accent-ink/90 sm:text-base">
              Every card is a real ATP season from 1990 to now. The player&apos;s results that year earn the points.
            </p>
          </div>
          <FannedCards />
        </div>
        <div
          className="h-3 border-t-2 border-fg bg-[repeating-linear-gradient(90deg,var(--gold)_0_8px,var(--accent)_8px_16px)]"
          aria-hidden
        />
      </section>

      <div className="mt-8">
        <Suspense fallback={<TodaySkeleton />}>
          <Today searchParams={searchParams} />
        </Suspense>
      </div>

      <Link
        href="/sandbox"
        className="group mt-8 flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-surface px-5 py-4 shadow-[4px_4px_0_0_var(--line)] transition hover:border-fg"
      >
        <span>
          <span className="block font-bold">Practice in the sandbox</span>
          <span className="block text-sm text-muted">Unlimited rolls with adjustable luck. Nothing is saved.</span>
        </span>
        <ArrowRight className="size-5 text-accent-text transition group-hover:translate-x-1" aria-hidden />
      </Link>
    </main>
  );
}
