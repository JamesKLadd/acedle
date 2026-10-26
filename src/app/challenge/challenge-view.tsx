import { CalendarDays, Crown, Flame, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CardPhoto } from "@/components/card-photo";
import { Tournament } from "@/components/tournament/tournament";
import { buttonClass, Card, Chip, Eyebrow, PageTitle, SectionTitle } from "@/components/ui";
import { getViewer } from "@/lib/auth/viewer";
import { challengeDay, challengeOutcome, FIRST_CHALLENGE } from "@/lib/challenge";
import { getChallenge, getRun, runsOf, todaysChallenge } from "@/lib/challenge-store";
import { fmtDay, fmtShortDay } from "@/lib/format";
import { addDays, utcDay } from "@/lib/roll/daily";
import { getSeasonPhoto } from "@/lib/season-photo";
import { bestStreak, currentStreak } from "@/lib/streak";
import { roundCount, runLabel, tierFormat, tierOf } from "@/lib/tournament";

import { ChallengePlay } from "./challenge-play";

/** The viewer's place on a day's board, once their run is over (accounts only). */
async function boardPlace(viewer: Awaited<ReturnType<typeof getViewer>>, day: string) {
  if (!viewer.isAccount) return null;
  const { data, error } = await viewer.supabase.rpc("challenge_leaderboard", { p_day: day });
  if (error) {
    console.error(`Couldn't load the challenge board: ${error.message}`);
    return null;
  }
  const mine = data.find((e) => e.is_viewer);
  return mine ? { rank: mine.rank, entries: mine.entries } : null;
}

/**
 * A day's challenge: today's to play (or carry on, or replay), an earlier
 * one to look back on. `day` (a route param) defaults to today.
 */
export async function ChallengeView({ day: asking }: { day?: Promise<string> }) {
  const [viewer, asked] = await Promise.all([getViewer(), asking]);
  const today = utcDay();
  const day = asked === undefined ? today : challengeDay(asked, today);
  if (!day) notFound();
  const isToday = day === today;

  const challenge = isToday ? await todaysChallenge() : await getChallenge(day).catch(() => null);
  if (!challenge) {
    if (!isToday) notFound();
    return (
      <>
        <PageTitle>Daily challenge</PageTitle>
        <Card className="mt-6">
          <p className="text-muted">The daily challenge isn&apos;t open yet. Check back soon.</p>
        </Card>
      </>
    );
  }

  const [run, photo, history] = await Promise.all([
    viewer.userId ? getRun(day, viewer.userId).catch(() => null) : null,
    getSeasonPhoto(challenge.card.playerId, challenge.card.year),
    viewer.userId ? runsOf(viewer.userId).catch(() => []) : [],
  ]);
  const rank = run?.roundsWon != null ? await boardPlace(viewer, day) : null;
  const { card, setup } = challenge;
  // Today's, or a run from yesterday that was still going at midnight (UTC).
  const playable = isToday || (run !== null && run.roundsWon === null && day === addDays(today, -1));
  const cardArt = <CardPhoto photo={photo} season={card} suggest={false} />;
  const tier = tierOf(challenge.tier);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle subtitle={isToday ? `Today · ${fmtShortDay(day)} · same card, same draw for everyone` : fmtDay(day)}>
        Challenge #{challenge.number}
      </PageTitle>
      <nav className="flex flex-wrap gap-3 text-sm">
        {day > FIRST_CHALLENGE && (
          <Link href={`/challenge/${addDays(day, -1)}`} className="text-muted hover:text-fg">
            ← Previous challenge
          </Link>
        )}
        {!isToday && (
          <Link href="/challenge" className="font-medium text-accent-text underline underline-offset-4">
            Today&apos;s challenge
          </Link>
        )}
        <Link href={`/leaderboard/challenge?day=${day}`} className="ml-auto text-muted hover:text-fg">
          {isToday ? "Today's board" : "That day's board"} →
        </Link>
      </nav>

      {playable ? (
        <ChallengePlay
          day={day}
          number={challenge.number}
          setup={setup}
          card={{ year: card.year, name: card.name }}
          cardArt={cardArt}
          initialRun={run}
          rank={rank}
          isAccount={viewer.isAccount}
        />
      ) : (
        <>
          <Card className="grid grid-cols-[5.5rem_1fr] gap-4 sm:grid-cols-[7rem_1fr]">
            <div>{cardArt}</div>
            <div className="min-w-0">
              <Eyebrow>
                Challenge #{challenge.number} · {tier.name}
              </Eyebrow>
              <p className="mt-1 font-display text-xl leading-tight uppercase sm:text-2xl">
                {card.year} {card.name}
              </p>
              <p className="mt-1 text-sm text-muted">
                Seed {setup.entrants[setup.you].seed} of {tier.size} · {tierFormat(tier)}
              </p>
              <PastResult run={run} setup={setup} rank={rank} />
            </div>
          </Card>
          <Tournament setup={setup} initialSets={run?.sets ?? []} readOnly />
        </>
      )}

      <History runs={history} today={today} />
    </div>
  );
}

function PastResult({
  run,
  setup,
  rank,
}: {
  run: Awaited<ReturnType<typeof getRun>>;
  setup: Parameters<typeof challengeOutcome>[0];
  rank: { rank: number; entries: number } | null;
}) {
  if (!run) return <p className="mt-3 text-sm text-muted">You didn&apos;t play this one.</p>;
  const outcome = challengeOutcome(setup, run.sets);
  return (
    <p className="mt-3 text-sm">
      Your run: <strong>{outcome.label ?? "unfinished"}</strong>
      {outcome.label && ` · ${outcome.setsWon}–${outcome.setsLost} in sets`}
      {rank && ` · #${rank.rank} of ${rank.entries}`}
    </p>
  );
}

/** The viewer's challenges, newest first, with their challenge streak. */
export function History({ runs, today }: { runs: Awaited<ReturnType<typeof runsOf>>; today: string }) {
  if (runs.length === 0) return null;
  const days = runs.map((r) => r.day);
  const streak = currentStreak(days, today);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>Your challenges</SectionTitle>
        <Chip className={streak > 0 ? "bg-cat-surface/15 text-cat-surface" : "bg-surface-2 text-muted"}>
          <Flame className="size-3.5" aria-hidden />
          {streak}-day streak · best {bestStreak(days)}
        </Chip>
      </div>
      <ol className="flex flex-col gap-2">
        {runs.map((r) => {
          const champion = r.run.roundsWon !== null && r.run.roundsWon >= roundCount(r.size);
          return (
            <li key={r.day}>
              <Link
                href={`/challenge/${r.day}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border-2 border-line bg-surface px-4 py-2.5 transition hover:border-accent/60"
              >
                {champion ? (
                  <Crown className="size-5 text-legendary" aria-hidden />
                ) : (
                  <CalendarDays className="size-5 text-subtle" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    #{r.number} · {tierOf(r.tier).name} · {r.card.year} {r.card.name}
                  </span>
                  <span className="block text-xs text-muted">{fmtShortDay(r.day)}</span>
                </span>
                <span className={`text-sm font-semibold ${champion ? "text-legendary" : ""}`}>
                  {r.run.roundsWon === null ? "In progress" : runLabel(r.run.roundsWon, r.size)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Today's challenge on the home page: start it, carry on, or how it went. */
export async function ChallengeLink() {
  const viewer = await getViewer();
  const challenge = await todaysChallenge();
  if (!challenge) return null;
  const run = viewer.userId ? await getRun(challenge.day, viewer.userId).catch(() => null) : null;
  const outcome = run && challengeOutcome(challenge.setup, run.sets);
  const rank = run?.roundsWon != null ? await boardPlace(viewer, challenge.day) : null;
  const tier = tierOf(challenge.tier);
  const champion = outcome?.champion ?? false;

  const detail = !run
    ? `${challenge.card.year} ${challenge.card.name} in a ${tier.name}. Same card, same draw for everyone.`
    : outcome?.label
      ? `${outcome.label}${rank ? ` · #${rank.rank} of ${rank.entries} today` : ""}. See how everyone did.`
      : `${challenge.card.year} ${challenge.card.name} in a ${tier.name}. Carry on with your run.`;

  return (
    <Link
      href="/challenge"
      className={`group flex items-center gap-4 rounded-lg border-2 bg-surface px-5 py-4 shadow-[4px_4px_0_0_var(--line)] transition hover:border-fg ${
        champion ? "border-legendary/60" : "border-line"
      }`}
    >
      {champion ? (
        <Crown className="size-7 shrink-0 text-legendary" aria-hidden />
      ) : (
        <Trophy className="size-7 shrink-0 text-blue" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          Daily challenge #{challenge.number}
          {outcome?.label ? `: ${champion ? "champion" : outcome.label.toLowerCase()}` : ""}
        </span>
        <span className="block text-sm text-muted">{detail}</span>
      </span>
      <span className={`${buttonClass({ size: "sm", variant: run ? "secondary" : "primary" })} shrink-0`}>
        {!run ? "Play" : outcome?.label ? "View" : "Continue"}
      </span>
    </Link>
  );
}
