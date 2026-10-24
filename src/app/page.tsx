import Link from "next/link";
import { Suspense } from "react";

import { Today, TodaySkeleton } from "./today";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-16">
      <h1 className="text-5xl font-bold tracking-tight">Acedle</h1>
      <p className="mt-3 text-lg text-muted">
        Roll a random season from 1990 to today, then a random top-100 player from it. Their real results earn badges,
        and the badges add up to your score. One roll a day.
      </p>

      <div className="mt-10">
        <Suspense fallback={<TodaySkeleton />}>
          <Today searchParams={searchParams} />
        </Suspense>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/sandbox" className="font-medium text-accent-text underline decoration-2 underline-offset-4">
          Practice in the sandbox: unlimited rolls, adjustable luck →
        </Link>
      </p>
    </main>
  );
}
