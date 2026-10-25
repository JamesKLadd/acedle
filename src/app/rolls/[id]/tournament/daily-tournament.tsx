"use client";

import { Trophy } from "lucide-react";
import { useState, useTransition } from "react";

import { Tournament } from "@/components/tournament/tournament";
import { buttonClass, Card } from "@/components/ui";
import type { StoredTournament } from "@/lib/tournament-store";

import { playSet, startTournament } from "./actions";

/** A daily roll's tournament for its owner: the "enter" step, then the run, saved set by set. */
export function DailyTournament({
  rollId,
  playerName,
  initial,
}: {
  rollId: string;
  playerName: string;
  initial: StoredTournament | null;
}) {
  const [tournament, setTournament] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (tournament) {
    return (
      <Tournament
        setup={tournament.setup}
        initialSets={tournament.sets}
        save={async (expected, won) => {
          const result = await playSet(rollId, expected, won);
          if (!result.ok) throw new Error(result.error);
          return result.tournament.sets;
        }}
      />
    );
  }

  function enter() {
    setError(null);
    startTransition(async () => {
      const result = await startTournament(rollId);
      if (result.ok) setTournament(result.tournament);
      else setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col items-start gap-4">
      <Trophy className="size-8 text-legendary" aria-hidden />
      <div>
        <p className="font-display text-2xl font-bold uppercase">Enter the draw</p>
        <p className="mt-1 text-muted">
          Take {playerName} into a 16-player draw of random player-seasons, seeded by score. Win your matches in a
          timing game: best of 3 sets, the final best of 5. One run per daily roll.
        </p>
      </div>
      <button onClick={enter} disabled={pending} className={buttonClass({ size: "lg" })}>
        <Trophy className="size-5" aria-hidden />
        {pending ? "Making the draw…" : "Enter the tournament"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}
