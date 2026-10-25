"use client";

import { Crown, Play, RotateCcw, Swords, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { buttonClass, Card, Eyebrow, FitText } from "@/components/ui";
import { flag } from "@/lib/flags";
import { fmtScore } from "@/lib/format";
import { sfx } from "@/lib/sound";
import {
  ROUNDS,
  tournamentState,
  winChance,
  type Entrant,
  type TournamentSetup,
  type TournamentState,
} from "@/lib/tournament";

import { Bracket } from "./bracket";
import { TimingGame } from "./timing-game";

interface Decided {
  round: number;
  opponent: number;
  won: number;
  lost: number;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

function Name({ e, className = "" }: { e: Entrant; className?: string }) {
  return (
    <span className={className}>
      <span aria-hidden>{flag(e.country)}</span> {e.year} {e.name}
    </span>
  );
}

function Contender({ e, label, odds }: { e: Entrant; label: string; odds: number }) {
  return (
    <div className="min-w-0 rounded-md border-2 border-line bg-surface shadow-[3px_3px_0_0_var(--line)] px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
        {label} · seed {e.seed}
      </p>
      <FitText
        text={e.name}
        className="mt-0.5 font-display leading-tight break-words uppercase [font-size:min(0.875rem,var(--fit))] sm:[font-size:min(1.25rem,var(--fit))]"
      />
      <p className="truncate text-xs text-muted">
        <span aria-hidden>{flag(e.country)}</span> {e.year} · #{e.finalRank}
      </p>
      <p className="tabular mt-1 font-mono text-sm font-semibold">
        {fmtScore(e.score)} <span className="font-sans text-xs font-normal text-muted">pts · {pct(odds)}</span>
      </p>
    </div>
  );
}

function SetDots({ sets, bestOf }: { sets: readonly boolean[]; bestOf: number }) {
  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={`Sets: ${sets.filter(Boolean).length}–${sets.filter((s) => !s).length}`}
    >
      {Array.from({ length: bestOf }, (_, i) => (
        <span
          key={i}
          className={`size-3 rounded-full ${
            i >= sets.length ? "bg-surface-2 ring-1 ring-line" : sets[i] ? "bg-[#34c759]" : "bg-red-500"
          }`}
        />
      ))}
    </span>
  );
}

/** The player's matches so far, round by round. */
function YourRun({ setup, state }: { setup: TournamentSetup; state: TournamentState }) {
  const mine = state.rounds.flat().filter((m) => m.sets !== null);
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {mine.map((m) => {
        const opp = setup.entrants[(m.a === setup.you ? m.b : m.a)!];
        const w = m.sets!.filter(Boolean).length;
        const l = m.sets!.length - w;
        const result = m.winner === null ? "vs" : m.winner === setup.you ? "Beat" : "Lost to";
        return (
          <li key={m.round} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs font-semibold tracking-wide text-muted uppercase">
              {ROUNDS[m.round]}
            </span>
            <span className="min-w-0 flex-1 truncate">
              <span
                className={
                  m.winner === null ? "text-muted" : m.winner === setup.you ? "text-accent-text" : "text-red-500"
                }
              >
                {result}
              </span>{" "}
              <Name e={opp} />
            </span>
            {m.sets!.length > 0 && (
              <span className="tabular shrink-0 font-mono text-xs text-muted">
                {w}–{l}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A tournament run: the draw, then the player's matches one set at a time.
 * `save` stores each set (daily tournaments) and resolves to the stored sets;
 * without it nothing is saved (sandbox). `readOnly` only shows the draw.
 */
export function Tournament({
  setup,
  initialSets,
  save,
  readOnly = false,
}: {
  setup: TournamentSetup;
  initialSets: readonly boolean[];
  save?: (expected: number, won: boolean) => Promise<boolean[]>;
  readOnly?: boolean;
}) {
  const [sets, setSets] = useState<boolean[]>([...initialSets]);
  const [view, setView] = useState<"draw" | "match">("draw");
  const [decided, setDecided] = useState<Decided | null>(null);
  const [saving, setSaving] = useState<{ expected: number; won: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useMemo(() => tournamentState(setup, sets), [setup, sets]);
  const you = setup.entrants[setup.you];

  // Switching between the draw and a match: bring its top into view if it is off screen.
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 64 || top > window.innerHeight / 2) root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view, decided]);

  function persist(expected: number, won: boolean) {
    if (!save) return;
    setSaving({ expected, won });
    setError(null);
    save(expected, won).then(
      (stored) => {
        setSaving(null);
        // Another tab moved on: follow the stored run.
        if (stored.length !== expected + 1 || stored[expected] !== won) {
          setSets(stored);
          setDecided(null);
          setView("draw");
        }
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : "Couldn't save that set.");
      },
    );
  }

  function onSet(won: boolean) {
    const m = state.current;
    if (!m) return;
    const expected = sets.length;
    setSets([...sets, won]);
    persist(expected, won);
    const w = m.won + Number(won);
    const l = m.lost + Number(!won);
    const need = Math.ceil(m.bestOf / 2);
    if (w === need || l === need) {
      setDecided({ round: m.round, opponent: m.opponent, won: w, lost: l });
      if (w === need && m.round === ROUNDS.length - 1) celebrate();
    }
  }

  function play() {
    setDecided(null);
    setView("match");
  }

  const busy = saving !== null;
  const errorBanner = error && (
    <div className="flex flex-wrap items-center gap-3 rounded-md border-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-sm">
      <span className="flex-1">{error}</span>
      <button onClick={() => saving && persist(saving.expected, saving.won)} className={buttonClass({ size: "sm" })}>
        <RotateCcw className="size-3.5" aria-hidden /> Retry
      </button>
    </div>
  );

  return (
    <div ref={root} className="scroll-mt-20">
      {view === "match" && !readOnly ? matchView() : drawView()}
    </div>
  );

  function matchView() {
    if (decided)
      return (
        <MatchOver
          setup={setup}
          state={state}
          decided={decided}
          onNext={play}
          onDraw={() => setView("draw")}
          busy={busy}
          error={errorBanner}
        />
      );
    const m = state.current;
    if (!m) return null;
    const opp = setup.entrants[m.opponent];
    const odds = winChance(you.score, opp.score);
    const mySets = state.rounds[m.round][m.index].sets ?? [];
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>
            {ROUNDS[m.round]} · best of {m.bestOf}
          </Eyebrow>
          <SetDots sets={mySets} bestOf={m.bestOf} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Contender e={you} label="You" odds={odds} />
          <Swords className="size-5 text-subtle" aria-hidden />
          <Contender e={opp} label="Opponent" odds={1 - odds} />
        </div>
        <p className="text-center text-sm text-muted">
          Sets{" "}
          <strong className="tabular font-mono text-fg">
            {m.won}–{m.lost}
          </strong>{" "}
          · Set {m.won + m.lost + 1}
        </p>
        {errorBanner}
        {busy && error ? null : <TimingGame key={sets.length} chance={odds} onResult={onSet} />}
        <p className="text-center text-xs text-subtle">
          Your odds are your share of the two scores ({pct(odds)}): better odds mean a wider green zone and a slower
          ball.
        </p>
      </div>
    );
  }

  function drawView() {
    const over = state.current === null;
    const champ = state.champion !== null ? setup.entrants[state.champion] : null;
    return (
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          {over ? (
            <div className="flex items-center gap-3">
              {state.roundsWon === ROUNDS.length ? (
                <Crown className="size-8 shrink-0 text-legendary" aria-hidden />
              ) : (
                <Trophy className="size-8 shrink-0 text-subtle" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="font-display text-2xl leading-tight font-bold uppercase">
                  {state.roundsWon === ROUNDS.length ? "Champion!" : `Out in the ${ROUNDS[state.round].toLowerCase()}`}
                </p>
                {champ && state.roundsWon !== ROUNDS.length && (
                  <p className="text-sm text-muted">
                    Won by <Name e={champ} className="font-semibold text-fg" />
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">
                  <Name e={you} className="font-semibold text-fg" /> is seed {you.seed} of 16.
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Next: {ROUNDS[state.current!.round]} vs{" "}
                  <Name e={setup.entrants[state.current!.opponent]} className="text-fg" />
                  {state.current!.won + state.current!.lost > 0 &&
                    ` (sets ${state.current!.won}–${state.current!.lost})`}
                </p>
              </div>
              {!readOnly && (
                <button onClick={play} disabled={busy} className={buttonClass({ size: "lg" })}>
                  <Play className="size-5" aria-hidden />
                  {sets.length === 0 ? "Start" : "Play"}
                </button>
              )}
            </div>
          )}
          {errorBanner}
          {state.rounds[0].some((m) => m.sets && m.sets.length > 0) && <YourRun setup={setup} state={state} />}
        </Card>
        <Bracket setup={setup} state={state} />
      </div>
    );
  }
}

function MatchOver({
  setup,
  state,
  decided,
  onNext,
  onDraw,
  busy,
  error,
}: {
  setup: TournamentSetup;
  state: TournamentState;
  decided: Decided;
  onNext: () => void;
  onDraw: () => void;
  busy: boolean;
  error: ReactNode;
}) {
  const won = decided.won > decided.lost;
  const opp = setup.entrants[decided.opponent];
  const champion = won && decided.round === ROUNDS.length - 1;
  const next = state.current;
  return (
    <Card className={`flex flex-col items-center gap-3 py-8 text-center ${champion ? "border-legendary/70" : ""}`}>
      {champion ? (
        <Crown className="size-12 animate-pop text-legendary" aria-hidden />
      ) : (
        <Trophy className={`size-10 animate-pop ${won ? "text-accent-text" : "text-subtle"}`} aria-hidden />
      )}
      <p className="font-display text-3xl font-bold uppercase">
        {champion ? "Champion!" : won ? "Match won" : `Out in the ${ROUNDS[decided.round].toLowerCase()}`}
      </p>
      <p className="text-muted">
        {won ? "Beat" : "Lost to"} <Name e={opp} className="font-semibold text-fg" />{" "}
        <span className="tabular font-mono">
          {decided.won}–{decided.lost}
        </span>
      </p>
      {error}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {won && next && (
          <button onClick={onNext} disabled={busy} className={buttonClass()}>
            <Play className="size-4" aria-hidden />
            {ROUNDS[next.round]} vs {setup.entrants[next.opponent].name}
          </button>
        )}
        <button
          onClick={onDraw}
          disabled={busy}
          className={buttonClass({
            variant: won && next ? "secondary" : "primary",
          })}
        >
          {won && next ? "See the draw" : "See how the draw ended"}
        </button>
      </div>
    </Card>
  );
}

function celebrate() {
  sfx.fanfare();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti").then(({ default: confetti }) =>
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.4 } }),
  );
}
