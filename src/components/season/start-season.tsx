"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startSeason } from "@/app/seasons/actions";
import { buttonClass, linkClass } from "@/components/ui";

/** Starts a season with a card, then opens it. */
export function StartSeasonButton({ rollId, label = "Start a season" }: { rollId: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; activeId?: string } | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await startSeason(rollId);
      if (result.ok) router.push(`/seasons/${result.season.id}`);
      else setError({ message: result.error, activeId: result.activeId });
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button onClick={start} disabled={pending} className={buttonClass()}>
        <CalendarRange className="size-4" aria-hidden />
        {pending ? "Making the draws…" : label}
      </button>
      {error && (
        <p className="text-sm text-accent-text">
          {error.message}{" "}
          {error.activeId && (
            <Link href={`/seasons/${error.activeId}`} className={linkClass}>
              Go to it
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
