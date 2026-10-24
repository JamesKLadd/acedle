"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Acedle couldn&apos;t load this page.</p>
      <button
        onClick={() => retry()}
        className="mt-6 rounded-lg bg-lime-500 px-5 py-2 font-semibold text-zinc-950 hover:bg-lime-400"
      >
        Try again
      </button>
    </main>
  );
}
