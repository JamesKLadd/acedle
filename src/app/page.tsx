import Link from "next/link";
import { Suspense } from "react";

import { Today, TodaySkeleton } from "./today";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-16">
      <h1 className="text-5xl font-bold tracking-tight">Acedle</h1>
      <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
        Roll a random season from 1990 to today, then a random top-100 player from it. Their real results earn badges,
        and the badges add up to your score. One roll a day.
      </p>

      <div className="mt-10">
        <Suspense fallback={<TodaySkeleton />}>
          <Today searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/sandbox" className="font-medium text-lime-600 underline underline-offset-4 dark:text-lime-400">
          Practice in the sandbox: unlimited rolls, adjustable luck →
        </Link>
      </p>
      <footer className="mt-16 text-xs text-zinc-500">
        Data by Jeff Sackmann (CC BY-NC-SA 4.0). Not affiliated with the ATP Tour.
      </footer>
    </main>
  );
}
