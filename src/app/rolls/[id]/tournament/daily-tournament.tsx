"use client";

import { Trophy } from "lucide-react";
import { useState, useTransition } from "react";

import { TierPicker } from "@/components/tournament/tier-picker";
import { Tournament } from "@/components/tournament/tournament";
import { Card } from "@/components/ui";
import type { TierId } from "@/lib/tournament";
import type { StoredTournament } from "@/lib/tournament-store";

import { playSet, startTournament } from "./actions";

/** A daily roll's tournament for its owner: picking one to enter, then the run, saved set by set. */
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
  const [picked, setPicked] = useState<TierId | null>(null);
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

  function enter(tier: TierId) {
    setError(null);
    setPicked(tier);
    startTransition(async () => {
      const result = await startTournament(rollId, tier);
      if (result.ok) setTournament(result.tournament);
      else setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Trophy className="size-8 shrink-0 text-legendary" aria-hidden />
        <div>
          <p className="font-display text-2xl font-bold uppercase">Pick a tournament</p>
          <p className="mt-1 text-muted">
            Take {playerName} into a draw of random player-seasons, seeded by score, and win your matches in a timing
            game. One tournament per daily roll, so choose well.
          </p>
        </div>
      </div>
      <TierPicker onPick={enter} pending={pending ? picked : null} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </Card>
  );
}
