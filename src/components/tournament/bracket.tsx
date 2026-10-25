import { Trophy } from "lucide-react";

import { flag } from "@/lib/flags";
import { fmtCompact } from "@/lib/format";
import { roundName, roundShort, type Match, type TournamentSetup, type TournamentState } from "@/lib/tournament";

/**
 * Whether a match's result can be shown yet: the player's own matches as
 * they're played; the others once the player has finished that round (they
 * happen alongside), and all of them when the run is over.
 */
export function isRevealed(state: TournamentState, m: Match) {
  return m.sets !== null || state.current === null || m.round < state.current.round;
}

function Row({
  setup,
  entrant,
  won,
  lost,
  tally,
}: {
  setup: TournamentSetup;
  entrant: number | null;
  won: boolean;
  lost: boolean;
  tally?: number;
}) {
  if (entrant === null) return <div className="h-7 px-2 text-xs leading-7 text-subtle">—</div>;
  const e = setup.entrants[entrant];
  const you = entrant === setup.you;
  return (
    <div
      className={`flex h-7 items-center gap-1.5 px-2 text-xs ${you ? "bg-accent-soft" : ""} ${
        lost ? "text-subtle" : won ? "font-semibold" : ""
      }`}
      title={`${e.year} ${e.name} · ${e.score.toLocaleString("en-US")} points`}
    >
      <span className="tabular w-4 shrink-0 text-right font-mono text-[10px] text-subtle">{e.seed}</span>
      <span aria-hidden>{flag(e.country)}</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="text-subtle">&apos;{String(e.year).slice(2)} </span>
        {e.name}
        {you && <span className="ml-1 text-[10px] font-semibold text-accent-text">YOU</span>}
      </span>
      <span className="tabular shrink-0 font-mono text-[10px] text-muted">{tally ?? fmtCompact(e.score)}</span>
    </div>
  );
}

function MatchBox({ setup, state, m }: { setup: TournamentSetup; state: TournamentState; m: Match }) {
  const revealed = isRevealed(state, m);
  // A side shows once the match feeding it is revealed.
  const feeder = (side: 0 | 1) =>
    m.round === 0 ? true : isRevealed(state, state.rounds[m.round - 1][2 * m.index + side]);
  const a = feeder(0) ? m.a : null;
  const b = feeder(1) ? m.b : null;
  const winner = revealed ? m.winner : null;
  const youA = m.sets !== null && m.a === setup.you;
  const won = m.sets?.filter(Boolean).length ?? 0;
  const lost = (m.sets?.length ?? 0) - won;
  const yours = m.sets !== null;
  return (
    <div
      className={`overflow-hidden rounded-md border-2 bg-surface ${yours ? "border-accent/70" : "border-line"} divide-y divide-line/70`}
    >
      <Row
        setup={setup}
        entrant={a}
        won={winner !== null && winner === m.a}
        lost={winner !== null && winner !== m.a}
        tally={yours && a !== null ? (youA ? won : lost) : undefined}
      />
      <Row
        setup={setup}
        entrant={b}
        won={winner !== null && winner === m.b}
        lost={winner !== null && winner !== m.b}
        tally={yours && b !== null ? (youA ? lost : won) : undefined}
      />
    </div>
  );
}

/** The whole draw, one column per round; scrolls sideways on small screens. */
export function Bracket({ setup, state }: { setup: TournamentSetup; state: TournamentState }) {
  const champion = state.current === null ? state.champion : null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex min-w-max gap-3">
        {state.rounds.map((matches, r) => (
          <div key={r} className="flex w-52 flex-col">
            <p className="mb-2 text-center text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              <span className="sm:hidden">{roundShort(setup.entrants.length, r)}</span>
              <span className="hidden sm:inline">{roundName(setup.entrants.length, r)}</span>
            </p>
            <div className="flex flex-1 flex-col justify-around gap-2">
              {matches.map((m) => (
                <MatchBox key={m.index} setup={setup} state={state} m={m} />
              ))}
            </div>
          </div>
        ))}
        <div className="flex w-36 flex-col">
          <p className="mb-2 text-center text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Champion</p>
          <div className="flex flex-1 flex-col justify-around">
            <div
              className={`flex flex-col items-center gap-1 rounded-md border-2 px-2 py-3 text-center text-xs ${
                champion === setup.you ? "border-legendary/70 bg-legendary/10" : "border-line bg-surface"
              }`}
            >
              <Trophy className={`size-5 ${champion !== null ? "text-legendary" : "text-subtle"}`} aria-hidden />
              {champion !== null ? (
                <span className="font-semibold">
                  {flag(setup.entrants[champion].country)} {setup.entrants[champion].year}{" "}
                  {setup.entrants[champion].name}
                </span>
              ) : (
                <span className="text-subtle">To be decided</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
