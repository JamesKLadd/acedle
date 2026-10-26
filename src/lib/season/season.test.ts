import { describe, expect, it } from "vitest";

import { CALENDAR, KNOCKOUTS, MAX_POINTS, POINTS } from "./calendar";
import { courtFactors, FATIGUE_MAX, fatigueAfter, FORM_MAX, matchOdds, NEUTRAL, nextForm } from "./odds";
import { RIVALS, seasonState, type Rival, type SeasonSetup } from "./season";
import { seasonShareText } from "./share";

const rival = (i: number, score: number, courts = NEUTRAL): Rival => ({
  playerId: 1000 + i,
  year: 2000,
  name: `Rival ${i}`,
  country: "SUI",
  finalRank: i + 1,
  score,
  courts,
});

/** A field of 40 rivals scoring 40k down to 1k; the player scores `score`. */
function setupFor(score: number, seed = 42): SeasonSetup {
  const rivals = Array.from({ length: RIVALS }, (_, i) => rival(i, (RIVALS - i) * 1000));
  return {
    you: { ...rival(-1, score), playerId: 1, name: "You" },
    rivals,
    entries: KNOCKOUTS.map((e, i) =>
      e.kind === "slam" ? [...Array(31).keys()] : Array.from({ length: 15 }, (_, k) => (i * 3 + k) % RIVALS),
    ),
    seed,
  };
}

const T = (n: number) => Array<boolean>(n).fill(true);
const F = (n: number) => Array<boolean>(n).fill(false);
/** Sets that win every knockout match: 3 per Slam match, 2 per Masters match. */
const ALL_KNOCKOUTS = KNOCKOUTS.flatMap((e) => (e.kind === "slam" ? T(15) : T(8)));

describe("calendar", () => {
  it("has four Slams and nine Masters, then the Finals", () => {
    expect(CALENDAR.filter((e) => e.kind === "slam").map((e) => e.short)).toEqual(["AO", "RG", "WIM", "USO"]);
    expect(CALENDAR.filter((e) => e.kind === "masters")).toHaveLength(9);
    expect(CALENDAR.at(-1)?.kind).toBe("finals");
    expect(MAX_POINTS).toBe(18_500);
  });
});

describe("odds", () => {
  it("scales strength by the season's record on each court", () => {
    expect(courtFactors(undefined)).toEqual(NEUTRAL);
    const clayCourter = courtFactors({ Clay: { wins: 30, losses: 2 }, Hard: { wins: 10, losses: 10 } });
    expect(clayCourter.Clay).toBeGreaterThan(1.3);
    expect(clayCourter.Hard).toBeLessThan(0.8);
    // No grass played: no different from overall.
    expect(clayCourter.Grass).toBe(1);
    // Indoor counts hard and carpet.
    expect(courtFactors({ Carpet: { wins: 20, losses: 0 }, Clay: { wins: 5, losses: 10 } }).Indoor).toBeGreaterThan(1.4);
  });

  it("adds court, form and fatigue to the score odds", () => {
    const you = { score: 1000, courts: { ...NEUTRAL, Clay: 2 } };
    const opp = { score: 1000, courts: NEUTRAL };
    const plain = matchOdds(you, opp, "Clay", 0, 0);
    expect(plain.base).toBe(0.5);
    expect(plain.court).toBeCloseTo(2 / 3 - 0.5);
    expect(plain.total).toBeCloseTo(2 / 3);
    const o = matchOdds(you, opp, "Clay", 0.2, 0.1);
    expect(o.form).toBeGreaterThan(0);
    expect(o.fatigue).toBeGreaterThan(0);
    expect(o.base + o.court + o.form - o.fatigue).toBeCloseTo(o.total);
    expect(matchOdds({ score: 1, courts: NEUTRAL }, { score: 1e12, courts: NEUTRAL }, "Hard", -0.35, 0.4).total).toBe(0.01);
  });

  it("moves even matches most with form and fatigue", () => {
    const even = matchOdds({ score: 1000, courts: NEUTRAL }, { score: 1000, courts: NEUTRAL }, "Hard", FORM_MAX, 0);
    expect(even.form).toBeCloseTo(0.087, 2);
    const longShot = matchOdds({ score: 10, courts: NEUTRAL }, { score: 1e8, courts: NEUTRAL }, "Hard", -FORM_MAX, 0);
    expect(-longShot.form).toBeLessThan(0.06);
  });

  it("compresses scores: ten times the score is about twice the strength", () => {
    const at = (a: number, b: number) => matchOdds({ score: a, courts: NEUTRAL }, { score: b, courts: NEUTRAL }, "Hard", 0, 0);
    expect(at(1_000_000, 100_000).base).toBeCloseTo(2 / 3, 1);
    expect(at(100_000_000, 100_000).base).toBeGreaterThan(0.85);
    expect(at(100_000_000, 100_000).base).toBeLessThan(0.95);
  });

  it("builds form on wins, drops it on losses, and tires with sets", () => {
    let form = 0;
    for (let i = 0; i < 6; i++) form = nextForm(form, true);
    expect(form).toBeCloseTo(FORM_MAX);
    form = nextForm(form, false);
    expect(form).toBeCloseTo(0);
    expect(nextForm(nextForm(form, false), false)).toBeCloseTo(-FORM_MAX);
    expect(fatigueAfter(4)).toBeCloseTo(0.1);
    expect(fatigueAfter(40)).toBe(FATIGUE_MAX);
  });
});

describe("seasonState", () => {
  it("starts at the Australian Open's first round", () => {
    const s = seasonState(setupFor(20_000), []);
    expect(s.current).toMatchObject({ event: 0, round: "Round of 32", bestOf: 5, won: 0, lost: 0 });
    expect(s.knockouts.map((k) => k.status)).toEqual(["current", ...Array(12).fill("upcoming")]);
    expect(s.knockouts.map((k) => k.draw!.entrants.length)).toEqual(KNOCKOUTS.map((e) => (e.kind === "slam" ? 32 : 16)));
    expect(s.finals.status).toBe("upcoming");
    expect(s).toMatchObject({ record: { wins: 0, losses: 0 }, points: 0, perfect: true, done: false });
  });

  it("crowns a perfect season", () => {
    const s = seasonState(setupFor(20_000), [...ALL_KNOCKOUTS, ...T(10), ...T(5)]);
    expect(s.done).toBe(true);
    expect(s.record).toEqual({ wins: 4 * 5 + 9 * 4 + 3 + 2, losses: 0 });
    expect(s.titles).toHaveLength(14);
    expect(s).toMatchObject({ points: MAX_POINTS, perfect: true, calendarSlam: true, setsUsed: 142 });
    expect(s.race[0]).toMatchObject({ you: true, points: MAX_POINTS });
    expect(s.finals).toMatchObject({ status: "done", you: 0, champion: 0, result: { label: "Champion", points: 1500 } });
  });

  it("plays on after losses, and misses the Finals without points", () => {
    const s = seasonState(setupFor(500), [...F(3), ...F(2)]);
    expect(s.knockouts[0].result).toEqual({ matchesWon: 0, matchesLost: 1, title: false, points: 100, label: "Round of 32" });
    expect(s.current).toMatchObject({ event: 2, round: "Round of 16" });
    expect(s).toMatchObject({ record: { wins: 0, losses: 2 }, perfect: false });

    const lostAll = seasonState(setupFor(500), KNOCKOUTS.flatMap((e) => F(e.kind === "slam" ? 3 : 2)));
    expect(lostAll).toMatchObject({ done: true, current: null, record: { wins: 0, losses: 13 }, points: 1300 });
    expect(lostAll.finals.status).toBe("missed");
    // The rivals still play the Finals.
    expect(lostAll.finals.field).toHaveLength(8);
    expect(lostAll.finals.champion).not.toBeNull();
  });

  it("gives every entrant ranking points for how far they got", () => {
    const s = seasonState(setupFor(500), F(3));
    const ao = s.knockouts[0];
    const total = s.race.reduce((n, r) => n + r.points, 0);
    // 16 first-round losers, 8, 4, 2, a runner-up and a champion.
    const slam = POINTS.slam;
    expect(total).toBe(16 * slam[0] + 8 * slam[1] + 4 * slam[2] + 2 * slam[3] + slam[4] + slam[5]);
    expect(s.race[0].points).toBe(2000);
    expect(ao.state?.champion).not.toBeNull();
  });

  it("carries form through the season (fading between events) and resets fatigue", () => {
    const setup = setupFor(20_000);
    const firstMatch = seasonState(setup, T(3));
    expect(firstMatch.form).toBeCloseTo(0.1);
    expect(firstMatch.current?.odds.fatigue).toBeGreaterThan(0);
    const afterAo = seasonState(setup, T(15));
    expect(afterAo.current).toMatchObject({ event: 1, round: "Round of 16" });
    // Five wins took form to the top; it fades by half into Indian Wells.
    expect(afterAo.form).toBeCloseTo(FORM_MAX / 2);
    expect(afterAo.current?.odds.fatigue).toBe(0);
    // A loss knocks form back.
    const lost = seasonState(setup, [...F(3), ...T(1)]);
    expect(lost.form).toBeCloseTo(-FORM_MAX / 2);
    expect(lost.current?.odds.form).toBeLessThan(0);
  });

  it("plays the Finals as a round robin, then semifinals", () => {
    const setup = setupFor(20_000);
    // Lose the first group match, win the next two.
    const s = seasonState(setup, [...ALL_KNOCKOUTS, false, false, true, true, true, true]);
    const group = s.finals.groups.find((g) => g.players.includes(s.finals.you!))!;
    const mine = group.matches.flat().filter((m) => m.sets !== null);
    expect(mine.map((m) => m.winner === s.finals.you)).toEqual([false, true, true]);
    expect(group.standings).toHaveLength(4);
    expect(s.record.losses).toBe(1);
    expect(s.perfect).toBe(false);
    // Two wins: through to the semifinals (or out on a tiebreak), either way the groups are done.
    expect(s.finals.groups.every((g) => g.matches.flat().every((m) => m.winner !== null))).toBe(true);
    expect(s.finals.semifinals).toHaveLength(2);
  });

  it("waits for the player's group match before their next one", () => {
    const s = seasonState(setupFor(20_000), [...ALL_KNOCKOUTS, true]);
    expect(s.current).toMatchObject({ event: 13, round: "Group stage", won: 1, lost: 0, bestOf: 3 });
    expect(s.finals.status).toBe("current");
    expect(s.finals.semifinals).toEqual([]);
  });

  it("seeds the top quarter of each draw and places the rest at random", () => {
    const draws = (seed: number) => seasonState(setupFor(500, seed), []).knockouts.map((k) => k.draw!);
    const [ao] = draws(1);
    // Seeds 1–8 in their places: 1 at the top, 2 at the bottom, 3 and 4 in the other quarters.
    expect([0, 30, 16, 14].map((p) => ao.entrants[p].seed)).toEqual([1, 2, 3, 4]);
    expect(ao.entrants.filter((e) => e.seed <= 8)).toHaveLength(8);
    // The unseeded land differently from season to season, the same way every replay.
    const order = (d: typeof ao) => d.entrants.map((e) => e.seed).join();
    expect(order(draws(1)[0])).toBe(order(ao));
    expect(order(draws(2)[0])).not.toBe(order(ao));
  });

  it("seeds by race points once the season seeds that way, card score breaking ties", () => {
    const setup: SeasonSetup = { ...setupFor(20_000), seeding: "points" };
    const seedOf = (s: ReturnType<typeof seasonState>, i: number, playerId: number) =>
      s.knockouts[i].draw!.entrants.find((e) => e.playerId === playerId)!.seed;

    // Everyone on 0 points at the Australian Open: seeded by score, 40k–21k ahead of the player.
    const start = seasonState(setup, []);
    expect(seedOf(start, 0, 1)).toBe(21);
    expect(start.knockouts.slice(1).every((k) => k.draw === null)).toBe(true);

    // The player wins the Australian Open: top seed at Indian Wells, above rivals with twice the score.
    const champ = seasonState(setup, T(15));
    expect(champ.knockouts[1].draw).not.toBeNull();
    expect(champ.knockouts.slice(2).every((k) => k.draw === null)).toBe(true);
    expect(seedOf(champ, 1, 1)).toBe(1);
    // The other seeds are the Masters field's best in the race, not by score.
    const ao = champ.knockouts[0].state!;
    const aoWins = new Map<number, number>();
    for (const m of ao.rounds.flat()) if (m.winner !== null) aoWins.set(m.winner, (aoWins.get(m.winner) ?? 0) + 1);
    const racePts = (playerId: number) => {
      const idx = champ.knockouts[0].draw!.entrants.findIndex((e) => e.playerId === playerId);
      return idx < 0 ? 0 : POINTS.slam[aoWins.get(idx) ?? 0];
    };
    const iw = champ.knockouts[1].draw!.entrants;
    const bySeed = [...iw].sort((a, b) => a.seed - b.seed);
    for (let k = 1; k < bySeed.length; k++) {
      const [a, b] = [bySeed[k - 1], bySeed[k]];
      expect(racePts(a.playerId) > racePts(b.playerId) || (racePts(a.playerId) === racePts(b.playerId) && a.score >= b.score)).toBe(true);
    }

    // Seasons from before keep their score seeding and their draws made in advance.
    expect(seedOf(seasonState(setupFor(20_000), T(15)), 1, 1)).not.toBe(1);
    expect(seasonState(setupFor(20_000), []).knockouts.every((k) => k.draw !== null)).toBe(true);
  });

  it("replays a season exactly", () => {
    const sets = [...T(9), false, ...T(20), ...F(7)];
    expect(seasonState(setupFor(9_000, 7), sets)).toEqual(seasonState(setupFor(9_000, 7), sets));
  });
});

describe("seasonShareText", () => {
  it("shares a perfect season", () => {
    const s = seasonState(setupFor(20_000), [...ALL_KNOCKOUTS, ...T(10)]);
    expect(seasonShareText(s, { year: 2015, name: "Novak Djokovic" })).toBe(
      [
        "Acedle season · 2015 Novak Djokovic",
        `${"🏆".repeat(13)} 🏆`,
        "61–0 · 14 titles · 18,500 pts",
        "👑 Perfect season",
        "🗓️ Calendar Grand Slam",
      ].join("\n"),
    );
  });

  it("shares a season in progress, events not played yet blank", () => {
    const s = seasonState(setupFor(500), [...F(3), ...F(2)]);
    const [title, events, record] = seasonShareText(s, { year: 1998, name: "Magnus Norman" }).split("\n");
    expect(title).toBe("Acedle season · 1998 Magnus Norman");
    expect(events).toBe(`🎾🎾${"⬜".repeat(11)} ⬜`);
    expect(record).toBe("0–2 · 0 titles · 200 pts (in progress)");
  });
});
