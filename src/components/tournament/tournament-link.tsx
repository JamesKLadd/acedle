import { ChevronRight, Crown, Trophy } from "lucide-react";
import Link from "next/link";

import { ROUNDS, runLabel, tournamentState } from "@/lib/tournament";
import type { StoredTournament } from "@/lib/tournament-store";

/**
 * A roll's way into its tournament: enter it, continue it, or see how it
 * went. Shows nothing to other viewers of a roll that has no tournament.
 */
export function TournamentLink({
  rollId,
  tournament,
  isOwner,
}: {
  rollId: string;
  tournament: StoredTournament | null;
  isOwner: boolean;
}) {
  if (!tournament && !isOwner) return null;
  const state = tournament && tournamentState(tournament.setup, tournament.sets);
  const champion = tournament?.roundsWon === ROUNDS.length;

  let title: string;
  let detail: string;
  if (!tournament || !state) {
    title = "Tournament mode";
    detail = "Take this player into a 16-player draw and play for the title.";
  } else if (state.current) {
    title = `Tournament: ${ROUNDS[state.current.round]}`;
    detail = `Next up: ${tournament.setup.entrants[state.current.opponent].name}. Continue your run.`;
  } else {
    title = champion ? "Tournament champion" : `Tournament: ${runLabel(state.roundsWon ?? 0)}`;
    detail = "See the full draw.";
  }

  return (
    <Link
      href={`/rolls/${rollId}/tournament`}
      className={`group flex items-center gap-4 rounded-2xl border bg-surface px-5 py-4 transition hover:border-accent/60 ${
        champion ? "border-legendary/60" : "border-line"
      }`}
    >
      {champion ? (
        <Crown className="size-7 shrink-0 text-legendary" aria-hidden />
      ) : (
        <Trophy className="size-7 shrink-0 text-accent-text" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
