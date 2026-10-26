"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { CardPhoto } from "@/components/card-photo";
import { SeasonPlay } from "@/components/season/season-play";
import { buttonClass, Card } from "@/components/ui";
import { parsePractice, usePracticeRaw } from "@/lib/season/practice";

const noSubscribe = () => () => {};

/** The practice season stored in this browser, played like a card's season. */
export function PracticeView() {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const raw = usePracticeRaw();
  const season = useMemo(() => parsePractice(raw), [raw]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-md bg-surface-2" />;
  if (!season || season.status === "abandoned") {
    return (
      <Card className="flex flex-col items-start gap-3">
        <CalendarRange className="size-8 text-subtle" aria-hidden />
        <p className="text-muted">No practice season in this browser. Roll a card in the sandbox and take it through a season.</p>
        <Link href="/sandbox" className={buttonClass()}>
          Go to the sandbox
        </Link>
      </Card>
    );
  }
  return (
    <SeasonPlay
      key={season.id}
      season={season}
      practice
      readOnly={false}
      card={<CardPhoto photo={season.photo} season={season.card} suggest={false} />}
    />
  );
}

/** On the sandbox page: the practice season in progress, if there is one. */
export function PracticeLink() {
  const raw = usePracticeRaw();
  const season = useMemo(() => parsePractice(raw), [raw]);
  if (!season || season.status === "abandoned") return null;
  const { you } = season.setup;
  return (
    <Link
      href="/sandbox/season"
      className="mb-6 flex items-center gap-3 rounded-lg border-2 border-line bg-surface px-4 py-3 text-sm shadow-[3px_3px_0_0_var(--line)] transition hover:border-fg"
    >
      <CalendarRange className="size-5 shrink-0 text-accent-text" aria-hidden />
      <span className="min-w-0 flex-1">
        Practice season: <strong>{you.year} {you.name}</strong>
        {season.status === "finished" ? " (finished)" : season.sets.length > 0 ? " (in progress)" : ""}
      </span>
      <span className="font-semibold text-accent-text">{season.status === "finished" ? "See it" : "Continue"} →</span>
    </Link>
  );
}
