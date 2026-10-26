"use client";

import { Crown, LogIn, Play, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";

import { ShareButton } from "@/components/share-button";
import { Tournament } from "@/components/tournament/tournament";
import { buttonClass, Card, Eyebrow } from "@/components/ui";
import { challengeOutcome, challengeShareText } from "@/lib/challenge";
import type { StoredRun } from "@/lib/challenge-store";
import { createClient } from "@/lib/supabase/client";
import { tierFormat, tierOf, type TournamentSetup } from "@/lib/tournament";

import { playChallengeSet, startChallenge } from "./actions";

/**
 * Today's challenge for the viewer: the card and draw, then their ranked
 * run (saved set by set), then how it went, with the board and replays
 * that aren't saved. A visitor without a session becomes a guest to play.
 */
export function ChallengePlay({
  day,
  number,
  setup,
  card,
  cardArt,
  initialRun,
  rank,
  isAccount,
}: {
  day: string;
  number: number;
  setup: TournamentSetup;
  card: { year: number; name: string };
  /** The card's photo, already rendered. */
  cardArt: ReactNode;
  initialRun: StoredRun | null;
  /** The viewer's place on today's board, once their run is over (accounts only). */
  rank: { rank: number; entries: number } | null;
  isAccount: boolean;
}) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [sets, setSets] = useState<boolean[]>(initialRun?.sets ?? []);
  const [replay, setReplay] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const outcome = useMemo(() => challengeOutcome(setup, sets), [setup, sets]);
  const tier = tierOf(setup.tier);
  const you = setup.entrants[setup.you];

  function start() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) return setError(`Couldn't start a guest session: ${error.message}`);
      }
      const result = await startChallenge(day);
      if (!result.ok) return setError(result.error);
      setRun(result.run);
      setSets(result.run.sets);
    });
  }

  async function save(expected: number, won: boolean) {
    const result = await playChallengeSet(day, expected, won);
    if (!result.ok) throw new Error(result.error);
    // The run is over: fetch the board place.
    if (result.run.roundsWon !== null) router.refresh();
    return result.run.sets;
  }

  const intro = (
    <Card className="grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[7rem_1fr]">
      <div>{cardArt}</div>
      <div className="min-w-0">
        <Eyebrow>
          Challenge #{number} · {tier.name}
        </Eyebrow>
        <p className="mt-1 font-display text-xl leading-tight uppercase sm:text-2xl">
          {card.year} {card.name}
        </p>
        <p className="mt-1 text-sm text-muted">
          Seed {you.seed} of {tier.size} · {tierFormat(tier)}
        </p>
        {!run && (
          <>
            <p className="mt-3 text-sm text-muted">
              Everyone plays this card in this draw today. Your first run is the one that counts; you can replay it
              afterwards for fun.
            </p>
            <button onClick={start} disabled={pending} className={`${buttonClass({ size: "lg" })} mt-4`}>
              <Play className="size-5" aria-hidden />
              {pending ? "Starting…" : "Start your run"}
            </button>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </>
        )}
      </div>
    </Card>
  );

  if (replay > 0) {
    return (
      <div className="flex flex-col gap-6">
        {intro}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-dashed border-line px-4 py-3 text-sm">
          <span>
            <strong>Replay</strong> · not saved or ranked
          </span>
          <button onClick={() => setReplay(0)} className={buttonClass({ variant: "secondary", size: "sm" })}>
            Back to your run
          </button>
        </div>
        <Tournament key={replay} setup={setup} initialSets={[]} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {intro}
      {run && outcome.roundsWon !== null && (
        <Card className={`flex flex-col gap-4 ${outcome.champion ? "border-legendary/70" : ""}`}>
          <div className="flex items-center gap-3">
            {outcome.champion ? (
              <Crown className="size-9 shrink-0 text-legendary" aria-hidden />
            ) : (
              <Trophy className="size-8 shrink-0 text-subtle" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight uppercase">
                {outcome.champion ? "Champion!" : outcome.label}
              </p>
              <p className="text-sm text-muted">
                {outcome.setsWon} {outcome.setsWon === 1 ? "set" : "sets"} won, {outcome.setsLost} lost
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ShareButton text={challengeShareText(day, setup, sets, card)} path={`/challenge/${day}`} />
            {isAccount ? (
              <Link href={`/leaderboard/challenge?day=${day}`} className={buttonClass({ variant: "secondary" })}>
                <Trophy className="size-4" aria-hidden />
                {rank ? `#${rank.rank} of ${rank.entries} today` : "Today's board"}
              </Link>
            ) : (
              <Link href="/" className={buttonClass({ variant: "secondary" })}>
                <LogIn className="size-4" aria-hidden /> Sign in to get on the board
              </Link>
            )}
            <button onClick={() => setReplay((n) => n + 1)} className={buttonClass({ variant: "ghost" })}>
              <RotateCcw className="size-4" aria-hidden /> Replay for fun
            </button>
          </div>
        </Card>
      )}
      {run ? (
        <Tournament setup={setup} initialSets={run.sets} save={save} onSets={setSets} />
      ) : (
        <Tournament setup={setup} initialSets={[]} readOnly />
      )}
    </div>
  );
}
