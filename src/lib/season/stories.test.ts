import { describe, expect, it } from "vitest";

import { CALENDAR, KNOCKOUTS } from "./calendar";
import { NEUTRAL } from "./odds";
import { RIVALS, seasonState, type Rival, type SeasonSetup } from "./season";
import { seasonShareText } from "./share";
import { newHeadlines, seasonStories, SHOCK_ODDS, UPSET_ODDS, who } from "./stories";

const rival = (i: number, score: number): Rival => ({
  playerId: 1000 + i,
  year: 2000,
  name: `Rival ${i}`,
  country: "SUI",
  finalRank: i + 1,
  score,
  courts: NEUTRAL,
});

/** 40 rivals scoring 40k down to 1k, the player on `score`, seeded by race points. */
function setupFor(score: number, seed = 42): SeasonSetup {
  return {
    you: { ...rival(-1, score), playerId: 1, name: "You" },
    rivals: Array.from({ length: RIVALS }, (_, i) => rival(i, (RIVALS - i) * 1000)),
    entries: KNOCKOUTS.map((e, i) =>
      e.kind === "slam" ? [...Array(31).keys()] : Array.from({ length: 15 }, (_, k) => (i * 3 + k) % RIVALS),
    ),
    seed,
    seeding: "points",
  };
}

const T = (n: number) => Array<boolean>(n).fill(true);
const F = (n: number) => Array<boolean>(n).fill(false);
const ALL_KNOCKOUTS = KNOCKOUTS.flatMap((e) => (e.kind === "slam" ? T(15) : T(8)));

/** Random seasons: a set-winning rate and a seed for each. */
function* seasons(n: number) {
  let x = 7;
  const rnd = () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let k = 0; k < n; k++) {
    const rate = 0.35 + rnd() * 0.6;
    const setup = setupFor(1000 + Math.round(rnd() * 30_000), k);
    yield { setup, sets: Array.from({ length: 220 }, () => rnd() < rate) };
  }
}

describe("seasonStories", () => {
  it("tells a title run", () => {
    const { headlines, rivalries, nemesis } = seasonStories(seasonState(setupFor(20_000), T(15)));
    expect(headlines.filter((h) => h.event === 0).map((h) => h.text)).toEqual([
      "Australian Open champion without dropping a set: title No. 1 of the season.",
      "You take the lead in the race.",
      "Still unbeaten: 5–0.",
    ]);
    expect(rivalries).toHaveLength(5);
    expect(nemesis).toBeNull();
  });

  it("tells a perfect season to the end", () => {
    const state = seasonState(setupFor(20_000), [...ALL_KNOCKOUTS, ...T(10)]);
    expect(state.done && state.perfect).toBe(true);
    const { headlines, recap } = seasonStories(state);
    const texts = headlines.map((h) => h.text);
    expect(texts).toContain("2 Slams out of 2: the Calendar Slam is on.");
    expect(texts).toContain("All four Slams: the Calendar Grand Slam!");
    expect(texts).toContain("Into the ATP Finals as No. 1 in the race.");
    expect(texts).toContain("ATP Finals champion without dropping a set: title No. 14 of the season.");
    expect(texts).toContain("Year-end No. 1 in the race.");
    expect(texts.filter((t) => t.endsWith("wins in a row."))).toHaveLength(6);
    expect(recap).toMatchObject({ longestStreak: state.record.wins, toughestLoss: null, nemesis: null, place: 1 });
    expect(recap.courts.map((c) => c.court)).toEqual(["Hard", "Clay", "Grass", "Indoor"]);
    expect(recap.courts.reduce((n, c) => n + c.points, 0)).toBe(state.points);
    expect(recap.courts.reduce((n, c) => n + c.wins, 0)).toBe(state.record.wins);
  });

  it("calls only long-shot wins upsets and only losses as a big favourite shocks", () => {
    for (const { setup, sets } of seasons(80)) {
      const state = seasonState(setup, sets);
      const { headlines } = seasonStories(state);
      for (const h of headlines.filter((x) => x.kind === "shock")) {
        const m = state.matches.find((x) => x.event === h.event && !x.won)!;
        expect(m.odds).toBeGreaterThanOrEqual(SHOCK_ODDS);
      }
      for (const h of headlines.filter((x) => x.kind === "upset")) {
        expect(state.matches.some((x) => x.event === h.event && x.won && x.odds <= UPSET_ODDS)).toBe(true);
      }
    }
  });

  it("stays consistent with the matches over many seasons", () => {
    let revenges = 0;
    let nemeses = 0;
    for (const { setup, sets } of seasons(120)) {
      const state = seasonState(setup, sets);
      const { headlines, rivalries, nemesis, recap } = seasonStories(state);

      // At most three per event, in calendar order.
      for (const [i] of CALENDAR.entries()) expect(headlines.filter((h) => h.event === i).length).toBeLessThanOrEqual(3);
      expect(headlines.map((h) => h.event)).toEqual([...headlines.map((h) => h.event)].sort((a, b) => a - b));

      // Every revenge follows a loss to the same rival.
      for (const h of headlines.filter((x) => x.kind === "revenge")) {
        revenges++;
        const won = state.matches.filter((m) => m.event === h.event && m.won && h.text.includes(who(m.opponent)));
        expect(won.length).toBeGreaterThan(0);
        const id = won[0].opponent.playerId;
        expect(state.matches.some((m) => m.opponent.playerId === id && !m.won && m.event <= h.event)).toBe(true);
      }

      // Rivalries add up to the record; the nemesis beat the player most, at least twice.
      expect(rivalries.reduce((n, r) => n + r.wins, 0)).toBe(state.record.wins);
      expect(rivalries.reduce((n, r) => n + r.losses, 0)).toBe(state.record.losses);
      const most = Math.max(0, ...rivalries.map((r) => r.losses));
      if (most >= 2) {
        nemeses++;
        expect(nemesis?.losses).toBe(most);
      } else expect(nemesis).toBeNull();

      // Titles and the recap.
      expect(headlines.filter((h) => h.kind === "title")).toHaveLength(state.titles.length);
      if (recap.biggestUpset) expect(recap.biggestUpset.won && recap.biggestUpset.odds < 0.5).toBe(true);
      if (recap.toughestLoss) expect(!recap.toughestLoss.won && recap.toughestLoss.odds > 0.5).toBe(true);
      expect(recap.place).toBe(state.race.findIndex((r) => r.you) + 1);
      if (recap.topRival) expect(state.race[recap.topRival.place - 1].you).toBe(false);
    }
    // The sample has both kinds of story.
    expect(revenges).toBeGreaterThan(5);
    expect(nemeses).toBeGreaterThan(5);
  });

  it("adds a finished season's upset and nemesis to the share text", () => {
    let shared = 0;
    for (const { setup, sets } of seasons(60)) {
      const state = seasonState(setup, sets);
      if (!state.done) continue;
      const { recap } = seasonStories(state);
      const text = seasonShareText(state, setup.you);
      expect(text.includes("😈 Nemesis:")).toBe(recap.nemesis !== null);
      expect(text.includes("💥 Upset:")).toBe(recap.biggestUpset !== null && recap.biggestUpset.odds <= UPSET_ODDS);
      if (recap.nemesis) {
        shared++;
        expect(text).toContain(`😈 Nemesis: ${who(recap.nemesis.rival)}, ${recap.nemesis.wins}–${recap.nemesis.losses}`);
      }
    }
    expect(shared).toBeGreaterThan(3);
  });

  it("finds the headlines a match added", () => {
    const setup = setupFor(20_000);
    const before = seasonStories(seasonState(setup, T(12))).headlines;
    const after = seasonStories(seasonState(setup, T(15))).headlines;
    expect(newHeadlines(before, after).map((h) => h.kind)).toEqual(["title", "race", "unbeaten"]);
    expect(newHeadlines(after, after)).toEqual([]);
  });

  it("names the first loss of an unbeaten run", () => {
    const state = seasonState(setupFor(20_000), [...T(15), ...F(2)]);
    const loss = state.matches.at(-1)!;
    expect(loss.won).toBe(false);
    expect(seasonStories(state).headlines.at(-1)).toMatchObject({
      event: 1,
      kind: "first-loss",
      text: `First loss of the season: ${loss.opponent.name} ('00) ends your unbeaten run at 5–0.`,
    });
  });
});
