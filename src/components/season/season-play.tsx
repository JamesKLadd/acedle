"use client";

import { ArrowLeft, CalendarRange, Crown, Flame, Play, RotateCcw, Snowflake, Trophy } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { abandonSeason, playSeasonSet } from "@/app/seasons/actions";
import { ShareButton } from "@/components/share-button";
import { Bracket } from "@/components/tournament/bracket";
import { TimingGame } from "@/components/tournament/timing-game";
import { SetDots } from "@/components/tournament/tournament";
import { buttonClass, Card, Eyebrow, FitText, SectionTitle } from "@/components/ui";
import { flag } from "@/lib/flags";
import { CALENDAR, KNOCKOUTS, MAX_POINTS } from "@/lib/season/calendar";
import { FORM_MAX } from "@/lib/season/odds";
import {
  eventRules,
  seasonState,
  type CurrentMatch,
  type EventResult,
  type Rival,
  type SeasonState,
} from "@/lib/season/season";
import { addPracticeSet, clearPractice } from "@/lib/season/practice";
import { seasonShareText } from "@/lib/season/share";
import { newHeadlines, seasonStories, type Headline, type SeasonStories } from "@/lib/season/stories";
import type { StoredSeason } from "@/lib/season/store";
import { sfx } from "@/lib/sound";
import { tournamentState } from "@/lib/tournament";

import { COURT_COLOR, COURT_LABEL } from "./court";
import { FinalsBoard } from "./finals-board";
import { RaceTable } from "./race-table";
import { SeasonCalendar } from "./season-calendar";
import { HeadlineList, Recap, Rivalries, Storylines } from "./storylines";

const pct = (p: number) => `${Math.round(p * 100)}%`;
const signed = (p: number) => `${p >= 0 ? "+" : "−"}${Math.round(Math.abs(p) * 100)}%`;
const fmtPts = (n: number) => n.toLocaleString("en-US");

/** A match the player just finished, and what it led to. */
interface Decided {
  event: number;
  round: string;
  opponent: Rival;
  won: boolean;
  score: [number, number];
  /** The player's result at the event, when this match ended their run in it. */
  eventResult: EventResult | null;
  /** The season's first lost match: no perfect season. */
  firstLoss: boolean;
  next: CurrentMatch | null;
  /** Storylines the match added. */
  news: Headline[];
}

/**
 * A season: the overview (calendar, the event in play, the race) and the
 * player's matches, one set at a time, saved as they go. `readOnly` for
 * anyone but the season's owner, and for seasons that are over.
 */
type Status = StoredSeason["status"];
type SeasonLike = Pick<StoredSeason, "id" | "setup" | "sets" | "status">;
type Saved = { ok: true; sets: boolean[]; status: Status } | { ok: false; error: string };

/** Where a season's sets go: the server for a card's season, the browser for a practice one. */
function saver(id: string, practice: boolean) {
  if (practice) {
    return {
      saveSet: async (expected: number, won: boolean): Promise<Saved> => {
        const stored = addPracticeSet(id, expected, won);
        return stored ? { ok: true, sets: stored.sets, status: stored.status } : { ok: false, error: "This practice season is gone." };
      },
      abandon: async (): Promise<Saved> => {
        clearPractice();
        return { ok: true, sets: [], status: "abandoned" };
      },
    };
  }
  const unwrap = (r: Awaited<ReturnType<typeof playSeasonSet>>): Saved =>
    r.ok ? { ok: true, sets: r.season.sets, status: r.season.status } : r;
  return {
    saveSet: (expected: number, won: boolean) => playSeasonSet(id, expected, won).then(unwrap),
    abandon: () => abandonSeason(id).then(unwrap),
  };
}

export function SeasonPlay({
  season,
  card,
  readOnly,
  practice = false,
}: {
  season: SeasonLike;
  /** The card's photo, already rendered. */
  card: ReactNode;
  readOnly: boolean;
  /** A sandbox season, kept in this browser. */
  practice?: boolean;
}) {
  const { setup } = season;
  const [sets, setSets] = useState<boolean[]>(season.sets);
  const [status, setStatus] = useState(season.status);
  const [view, setView] = useState<"overview" | "match">("overview");
  const [decided, setDecided] = useState<Decided | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState<{ expected: number; won: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useMemo(() => seasonState(setup, sets), [setup, sets]);
  const stories = useMemo(() => seasonStories(state), [state]);
  const playable = !readOnly && status === "active";
  const top = useRef<HTMLDivElement>(null);
  const store = useMemo(() => saver(season.id, practice), [season.id, practice]);

  function persist(expected: number, won: boolean) {
    setSaving({ expected, won });
    setError(null);
    store.saveSet(expected, won).then(
      (stored) => {
        if (!stored.ok) {
          setError(stored.error);
          return;
        }
        setSaving(null);
        setStatus(stored.status);
        // Another tab moved on: follow the stored season.
        if (stored.sets.length !== expected + 1 || stored.sets[expected] !== won) {
          setSets(stored.sets);
          setDecided(null);
          setView("overview");
        }
      },
      () => setError("Couldn't save that set."),
    );
  }

  function onSet(won: boolean) {
    const match = state.current;
    if (!match) return;
    const expected = sets.length;
    const next = [...sets, won];
    setSets(next);
    persist(expected, won);
    const need = Math.ceil(match.bestOf / 2);
    const w = match.won + Number(won);
    const l = match.lost + Number(!won);
    if (w < need && l < need) return;

    const after = seasonState(setup, next);
    const eventOver = !after.current || after.current.event !== match.event;
    const eventResult = !eventOver
      ? null
      : match.event < KNOCKOUTS.length
        ? after.knockouts[match.event].result
        : after.finals.result;
    setDecided({
      event: match.event,
      round: match.round,
      opponent: match.opponent,
      won: w === need,
      score: [w, l],
      eventResult,
      firstLoss: w < need && state.record.losses === 0,
      next: after.current,
      // The screen already says when it's a title.
      news: newHeadlines(stories.headlines, seasonStories(after).headlines).filter((h) => h.kind !== "title"),
    });
    if (eventResult?.title) celebrate();
  }

  function play() {
    setDecided(null);
    setView("match");
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function overview() {
    setDecided(null);
    setView("overview");
  }

  const errorBanner = error && (
    <div className="flex flex-wrap items-center gap-3 rounded-md border-2 border-red-500/50 bg-red-500/10 px-4 py-3 text-sm">
      <span className="flex-1">{error}</span>
      <button onClick={() => saving && persist(saving.expected, saving.won)} className={buttonClass({ size: "sm" })}>
        <RotateCcw className="size-3.5" aria-hidden /> Retry
      </button>
    </div>
  );

  return (
    <div ref={top} className="flex scroll-mt-20 flex-col gap-6">
      <SeasonHeader season={season} state={state} status={status} card={card} practice={practice} />
      {decided ? (
        <MatchOver decided={decided} onNext={play} onOverview={overview} busy={saving !== null} error={errorBanner} />
      ) : view === "match" && playable && state.current ? (
        <MatchView
          state={state}
          match={state.current}
          sets={sets}
          onSet={onSet}
          onOverview={overview}
          busy={saving !== null && error !== null}
          error={errorBanner}
        />
      ) : (
        <Overview
          seasonId={season.id}
          share={!readOnly && !practice && sets.length > 0 ? seasonShareText(state, setup.you) : null}
          onGiveUp={store.abandon}
          state={state}
          stories={stories}
          status={status}
          playable={playable}
          selected={selected ?? state.current?.event ?? lastPlayed(state)}
          onSelect={setSelected}
          onPlay={play}
          onAbandoned={() => setStatus("abandoned")}
          error={errorBanner}
        />
      )}
    </div>
  );
}

/** The last event the player took part in (for a finished season's default view). */
function lastPlayed(state: SeasonState) {
  if (state.finals.status === "done") return CALENDAR.length - 1;
  return KNOCKOUTS.length - 1;
}

function celebrate() {
  sfx.fanfare();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  void import("canvas-confetti").then(({ default: confetti }) =>
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 } }),
  );
}

// ------------------------------------------------------------------ header

const STATUS_LABEL = { active: "In progress", finished: "Finished", abandoned: "Unfinished" } as const;

function formLabel(form: number) {
  const f = form / FORM_MAX;
  if (f >= 0.6) return "On fire";
  if (f >= 0.2) return "In form";
  if (f > -0.2) return "Steady";
  if (f > -0.6) return "Shaky";
  return "Slumping";
}

function SeasonHeader({
  season,
  state,
  status,
  card,
  practice,
}: {
  season: SeasonLike;
  state: SeasonState;
  status: Status;
  card: ReactNode;
  practice: boolean;
}) {
  const { you } = season.setup;
  const place = state.race.findIndex((r) => r.you) + 1;
  const stat = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className="tabular font-mono text-lg font-bold">{value}</dd>
    </div>
  );
  return (
    <Card className="grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[7rem_1fr]">
      <div>{card}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[3px] bg-blue px-1.5 font-display text-sm text-gold">{you.year}</span>
          <span
            className={`rounded-[4px] border-2 px-1.5 text-[10px] font-bold tracking-wider uppercase ${
              status === "active" ? "border-accent text-accent-text" : "border-line text-muted"
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          {practice && (
            <span className="rounded-[4px] bg-amber-400 px-1.5 text-[10px] font-bold tracking-wider text-zinc-950 uppercase">
              Practice · not saved
            </span>
          )}
          {state.perfect && state.record.wins > 0 && (
            <span className="flex items-center gap-1 rounded-[4px] border-2 border-legendary px-1.5 text-[10px] font-bold tracking-wider text-legendary uppercase">
              <Crown className="size-3" aria-hidden /> {state.done ? "Perfect season" : "Unbeaten"}
            </span>
          )}
          {state.calendarSlam && (
            <span className="rounded-[4px] border-2 border-legendary px-1.5 text-[10px] font-bold tracking-wider text-legendary uppercase">
              Calendar Slam
            </span>
          )}
        </div>
        <FitText
          as="h1"
          text={you.name}
          className="mt-1 font-display leading-tight break-words uppercase [font-size:min(1.4rem,var(--fit))] sm:[font-size:min(2rem,var(--fit))]"
        >
          <span aria-hidden className="mr-1">
            {flag(you.country)}
          </span>
          {you.name}
        </FitText>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 min-[480px]:grid-cols-4">
          {stat("Record", `${state.record.wins}–${state.record.losses}`)}
          {stat("Titles", state.titles.length)}
          {stat("Points", fmtPts(state.points))}
          {stat("Race", state.race.some((r) => r.points > 0) ? `#${place}` : "—")}
        </dl>
        {status === "active" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            {state.form >= 0 ? (
              <Flame className="size-3.5 text-accent-text" aria-hidden />
            ) : (
              <Snowflake className="size-3.5 text-blue" aria-hidden />
            )}
            Form: <strong className="text-fg">{formLabel(state.form)}</strong>
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- overview

function Overview({
  seasonId,
  share,
  onGiveUp,
  state,
  stories,
  status,
  playable,
  selected,
  onSelect,
  onPlay,
  onAbandoned,
  error,
}: {
  seasonId: string;
  /** The share text, for the season's owner once it's under way. */
  share: string | null;
  onGiveUp: () => Promise<Saved>;
  state: SeasonState;
  stories: SeasonStories;
  status: StoredSeason["status"];
  playable: boolean;
  selected: number;
  onSelect: (event: number) => void;
  onPlay: () => void;
  onAbandoned: () => void;
  error: ReactNode;
}) {
  const match = state.current;
  return (
    <>
      {error}
      {status === "active" && match && playable && <NextMatch state={state} match={match} sets={null} onPlay={onPlay} />}
      {state.done && <SeasonOver state={state} stories={stories} />}
      {share && (
        <div className="-mt-2">
          <ShareButton text={share} path={`/seasons/${seasonId}`} title="Share your season" />
        </div>
      )}

      <Storylines headlines={stories.headlines} />

      <section>
        <SectionTitle className="mb-3">Calendar</SectionTitle>
        <SeasonCalendar state={state} selected={selected} onSelect={onSelect} />
      </section>

      <section>
        <EventDetail state={state} index={selected} headlines={stories.headlines.filter((h) => h.event === selected)} />
      </section>

      <section>
        <SectionTitle className="mb-3">The race</SectionTitle>
        <p className="mb-3 text-sm text-muted">
          Points from every event so far. The top 8 after Paris play the ATP Finals.
        </p>
        <RaceTable race={state.race} />
      </section>

      <Rivalries rivalries={stories.rivalries} nemesis={stories.nemesis} />

      {playable && <GiveUp onGiveUp={onGiveUp} onAbandoned={onAbandoned} />}
    </>
  );
}

/** The event picked on the calendar: its draw (or the Finals) and the player's result. */
function EventDetail({ state, index, headlines }: { state: SeasonState; index: number; headlines: Headline[] }) {
  const event = CALENDAR[index];
  const heading = (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <SectionTitle>{event.name}</SectionTitle>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span className="size-2.5 rounded-full" style={{ background: COURT_COLOR[event.court] }} />
          {COURT_LABEL[event.court]} ·{" "}
          {event.kind === "slam" ? "32 players, best of 5" : event.kind === "masters" ? "16 players, best of 3" : "Top 8, best of 3"}
        </span>
      </div>
      {headlines.length > 0 && (
        <div className="mb-3">
          <HeadlineList headlines={headlines} />
        </div>
      )}
    </>
  );

  if (event.kind === "finals") {
    const finals = state.finals;
    return (
      <>
        {heading}
        {finals.status === "upcoming" ? (
          <p className="rounded-md border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            The top 8 in the race after Paris play two groups of four; the top two of each go through to the
            semifinals.
          </p>
        ) : (
          <>
            {finals.status === "missed" && (
              <p className="mb-3 text-sm text-muted">You didn&apos;t make the top 8. Here&apos;s how the Finals went.</p>
            )}
            <FinalsBoard finals={finals} />
          </>
        )}
      </>
    );
  }

  const ko = state.knockouts[index];
  if (!ko.draw) {
    return (
      <>
        {heading}
        <p className="rounded-md border-2 border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          The draw is made once {CALENDAR[index - 1].name} is over, seeded by race points.
        </p>
      </>
    );
  }
  // Upcoming draws already made (seasons seeded by card score) keep their results hidden until they're played.
  const shown = ko.state ?? tournamentState(ko.draw, [], eventRules(event));
  return (
    <>
      {heading}
      {ko.status === "upcoming" && <p className="mb-3 text-sm text-muted">The draw is out. Results show as it&apos;s played.</p>}
      <Bracket setup={ko.draw} state={shown} />
    </>
  );
}

function SeasonOver({ state, stories }: { state: SeasonState; stories: SeasonStories }) {
  const titles = CALENDAR.filter((e) => state.titles.includes(e.id));
  return (
    <Card className={`flex flex-col items-center gap-2 py-8 text-center ${state.perfect ? "border-legendary/70" : ""}`}>
      {state.perfect ? (
        <Crown className="size-12 text-legendary" aria-hidden />
      ) : (
        <Trophy className={`size-10 ${titles.length ? "text-legendary" : "text-subtle"}`} aria-hidden />
      )}
      <p className="font-display text-3xl uppercase">{state.perfect ? "A perfect season" : "Season over"}</p>
      <p className="text-muted">
        {state.record.wins}–{state.record.losses} · {titles.length} {titles.length === 1 ? "title" : "titles"} ·{" "}
        {fmtPts(state.points)} of {fmtPts(MAX_POINTS)} points
      </p>
      {titles.length > 0 && <p className="max-w-md text-sm text-muted">Won {titles.map((e) => e.name).join(", ")}.</p>}
      <div className="mt-4 flex w-full justify-center border-t-2 border-dashed border-line px-2 pt-5">
        <Recap recap={stories.recap} />
      </div>
    </Card>
  );
}

function GiveUp({ onGiveUp, onAbandoned }: { onGiveUp: () => Promise<Saved>; onAbandoned: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function giveUp() {
    setPending(true);
    const result = await onGiveUp();
    setPending(false);
    if (result.ok) onAbandoned();
    else setError(result.error);
  }
  return (
    <div className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line pt-4 text-sm text-muted">
      {confirming ? (
        <>
          <span>Give up this season? It stays in your history as unfinished.</span>
          <button onClick={giveUp} disabled={pending} className={buttonClass({ variant: "secondary", size: "sm" })}>
            {pending ? "Giving up…" : "Give up"}
          </button>
          <button onClick={() => setConfirming(false)} className={buttonClass({ variant: "ghost", size: "sm" })}>
            Keep playing
          </button>
        </>
      ) : (
        <button onClick={() => setConfirming(true)} className="underline underline-offset-4 hover:text-fg">
          Give up this season
        </button>
      )}
      {error && <span className="text-accent-text">{error}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ matches

/** Who the player meets next, at what odds, and the button to play. */
function NextMatch({
  state,
  match,
  sets,
  onPlay,
}: {
  state: SeasonState;
  match: CurrentMatch;
  /** The player's sets in this match so far, for the dots (match view). */
  sets: boolean[] | null;
  onPlay?: () => void;
}) {
  const event = CALENDAR[match.event];
  const you = state.race.find((r) => r.you)!.rival;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>
          <span className="mr-1.5 inline-block size-2.5 rounded-full align-middle" style={{ background: COURT_COLOR[event.court] }} />
          {event.name} · {match.round} · best of {match.bestOf}
        </Eyebrow>
        {sets ? (
          <SetDots sets={sets} bestOf={match.bestOf} />
        ) : (
          match.won + match.lost > 0 && (
            <span className="tabular font-mono text-xs text-muted">
              Sets {match.won}–{match.lost}
            </span>
          )
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side rival={you} label="You" court={event.court} odds={match.odds.total} />
        <span className="font-display text-sm text-subtle">VS</span>
        <Side rival={match.opponent} label="Opponent" court={event.court} odds={1 - match.odds.total} />
      </div>
      <OddsLine match={match} />
      {onPlay && (
        <button onClick={onPlay} className={`${buttonClass({ size: "lg" })} self-start`}>
          <Play className="size-5" aria-hidden />
          {match.won + match.lost > 0 ? "Continue the match" : "Play"}
        </button>
      )}
    </Card>
  );
}

function Side({
  rival,
  label,
  court,
  odds,
}: {
  rival: Rival & { seed?: number };
  label: string;
  court: keyof Rival["courts"];
  odds: number;
}) {
  const factor = rival.courts[court];
  return (
    <div className="min-w-0 rounded-md border-2 border-line bg-surface px-3 py-2.5 shadow-[3px_3px_0_0_var(--line)]">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
        {label}
        {rival.seed && rival.seed <= 8 ? ` · seed ${rival.seed}` : ""}
      </p>
      <FitText
        text={rival.name}
        className="mt-0.5 font-display leading-tight break-words uppercase [font-size:min(0.875rem,var(--fit))] sm:[font-size:min(1.25rem,var(--fit))]"
      />
      <p className="truncate text-xs text-muted">
        <span aria-hidden>{flag(rival.country)}</span> {rival.year} · #{rival.finalRank}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs">
        <span className="tabular font-mono text-sm font-semibold">{pct(odds)}</span>
        {Math.abs(factor - 1) >= 0.05 && (
          <span className={factor > 1 ? "text-cat-matches" : "text-accent-text"}>
            {COURT_LABEL[court].split(" ")[0]} ×{factor.toFixed(2)}
          </span>
        )}
      </p>
    </div>
  );
}

/** "62%: scores 55% · clay +6% · form +4% · fatigue −3%" */
function OddsLine({ match }: { match: CurrentMatch }) {
  const { odds } = match;
  const court = CALENDAR[match.event].court;
  const parts = [
    `scores ${pct(odds.base)}`,
    Math.abs(odds.court) >= 0.005 && `${COURT_LABEL[court].toLowerCase()} ${signed(odds.court)}`,
    Math.abs(odds.form) >= 0.005 && `form ${signed(odds.form)}`,
    odds.fatigue >= 0.005 && `fatigue ${signed(-odds.fatigue)}`,
  ].filter(Boolean);
  return (
    <p className="text-sm text-muted">
      Your odds <strong className="tabular font-mono text-fg">{pct(odds.total)}</strong>: {parts.join(" · ")}. Better odds
      mean a wider green zone and a slower ball.
    </p>
  );
}

function MatchView({
  state,
  match,
  sets,
  onSet,
  onOverview,
  busy,
  error,
}: {
  state: SeasonState;
  match: CurrentMatch;
  sets: boolean[];
  onSet: (won: boolean) => void;
  onOverview: () => void;
  busy: boolean;
  error: ReactNode;
}) {
  const inMatch = sets.slice(sets.length - match.won - match.lost);
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onOverview} className="flex items-center gap-1 self-start text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Season overview
      </button>
      <NextMatch state={state} match={match} sets={inMatch} />
      {error}
      {!busy && <TimingGame key={sets.length} chance={match.odds.total} onResult={onSet} />}
    </div>
  );
}

function MatchOver({
  decided,
  onNext,
  onOverview,
  busy,
  error,
}: {
  decided: Decided;
  onNext: () => void;
  onOverview: () => void;
  busy: boolean;
  error: ReactNode;
}) {
  const event = CALENDAR[decided.event];
  const result = decided.eventResult;
  const next = decided.next;
  return (
    <Card className={`flex flex-col items-center gap-3 py-8 text-center ${result?.title ? "border-legendary/70" : ""}`}>
      {result?.title ? (
        <Crown className="size-12 animate-pop text-legendary" aria-hidden />
      ) : (
        <Trophy className={`size-10 animate-pop ${decided.won ? "text-accent-text" : "text-subtle"}`} aria-hidden />
      )}
      <p className="font-display text-3xl uppercase">
        {result?.title ? `${event.name} champion!` : decided.won ? "Match won" : "Match lost"}
      </p>
      <p className="text-muted">
        {decided.won ? "Beat" : "Lost to"}{" "}
        <strong className="text-fg">
          {flag(decided.opponent.country)} {decided.opponent.year} {decided.opponent.name}
        </strong>{" "}
        <span className="tabular font-mono">
          {decided.score[0]}–{decided.score[1]}
        </span>{" "}
        · {decided.round}
      </p>
      {result && !result.title && (
        <p className="text-sm text-muted">
          {event.name}: {result.label.toLowerCase()} · +{fmtPts(result.points)} points
        </p>
      )}
      {result?.title && <p className="text-sm text-muted">+{fmtPts(result.points)} points</p>}
      {decided.firstLoss && !decided.news.some((h) => h.kind === "first-loss") && (
        <p className="text-sm font-semibold text-accent-text">That&apos;s the first loss: no perfect season this time.</p>
      )}
      {decided.news.length > 0 && (
        <div className="w-full max-w-md rounded-md border-2 border-line bg-surface-2/50 px-4 py-3 text-left">
          <HeadlineList headlines={decided.news} />
        </div>
      )}
      {error}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {next && (
          <button onClick={onNext} disabled={busy} className={buttonClass()}>
            <Play className="size-4" aria-hidden />
            {next.event !== decided.event ? `${CALENDAR[next.event].name}: ` : ""}
            {next.round} vs {next.opponent.name}
          </button>
        )}
        <button onClick={onOverview} disabled={busy} className={buttonClass({ variant: next ? "secondary" : "primary" })}>
          <CalendarRange className="size-4" aria-hidden />
          {next ? "Season overview" : "See your season"}
        </button>
      </div>
    </Card>
  );
}
