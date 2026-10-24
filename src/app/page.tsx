import { ArrowRight, Award, Dices, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Today, TodaySkeleton } from "./today";

const STEPS = [
  { icon: Dices, title: "Roll", text: "A random season, then a random top-100 player" },
  { icon: Award, title: "Score", text: "Their real results earn badges and multipliers" },
  { icon: Trophy, title: "Compete", text: "Climb the daily, weekly and all-time boards" },
];

/** Faint court lines behind the hero. */
function CourtLines() {
  return (
    <svg
      viewBox="0 0 400 220"
      className="pointer-events-none absolute -top-4 -right-28 hidden sm:block h-[115%] opacity-[0.14] [mask-image:linear-gradient(to_left,black_25%,transparent_60%)]"
      fill="none"
      stroke="#d4f53c"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="20" y="10" width="360" height="200" />
      <rect x="20" y="35" width="360" height="150" />
      <line x1="200" y1="10" x2="200" y2="210" strokeWidth="3" />
      <line x1="110" y1="35" x2="110" y2="185" />
      <line x1="290" y1="35" x2="290" y2="185" />
      <line x1="110" y1="110" x2="290" y2="110" />
    </svg>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-8 pb-6">
      <section className="relative overflow-hidden rounded-3xl bg-panel p-6 text-panel-fg shadow-lg sm:p-8">
        <CourtLines />
        <p className="relative text-xs font-semibold tracking-[0.2em] text-[#d4f53c] uppercase">Daily tennis roll</p>
        <h1 className="relative mt-2 font-display text-[2.6rem] leading-[0.92] font-extrabold uppercase min-[400px]:text-5xl sm:text-6xl">
          Roll a season.
          <br />
          <span className="text-[#d4f53c]">Score the stats.</span>
        </h1>
        <p className="relative mt-3 max-w-md text-panel-fg/75">
          One roll a day from every ATP season since 1990. Real results, real badges, one score.
        </p>
        <ul className="relative mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-1.5 rounded-xl bg-white/5 p-3 ring-1 ring-white/10 sm:flex-row sm:gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-[#d4f53c]" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="hidden text-xs text-panel-fg/65 sm:block">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <Suspense fallback={<TodaySkeleton />}>
          <Today searchParams={searchParams} />
        </Suspense>
      </div>

      <Link
        href="/sandbox"
        className="group mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 transition hover:border-accent/60"
      >
        <span>
          <span className="block font-semibold">Practice in the sandbox</span>
          <span className="block text-sm text-muted">Unlimited rolls with adjustable luck. Nothing is saved.</span>
        </span>
        <ArrowRight className="size-5 text-accent-text transition group-hover:translate-x-1" aria-hidden />
      </Link>
    </main>
  );
}
