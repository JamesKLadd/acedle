"use client";

import { useEffect } from "react";

import { buttonClass } from "@/components/ui";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase">Something went wrong</h1>
      <p className="mt-3 text-muted">Acedle couldn&apos;t load this page.</p>
      <button
        onClick={() => retry()}
        className={`${buttonClass()} mt-6`}
      >
        Try again
      </button>
    </main>
  );
}
