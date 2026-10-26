// Wordle-style share text for a season.

import { fmtScore } from "../format";
import type { EventResult, Rival, SeasonState } from "./season";
import { pct, seasonStories, UPSET_ODDS, who } from "./stories";

/** One emoji per event: 🏆 title, 🥈 final, 🥉 semifinal, 🎾 out earlier, ⬜ not played (yet). */
export function eventEmoji({ result }: { result: EventResult | null }): string {
  if (!result) return "⬜";
  if (result.title) return "🏆";
  if (result.label === "Final") return "🥈";
  if (result.label === "Semifinal") return "🥉";
  return "🎾";
}

/**
 * Acedle season · 2008 Rafael Nadal
 * 🏆🏆🥈🏆🏆🥉🏆🏆🎾🏆🏆🏆🏆 🏆
 * 56–3 · 11 titles · 15,250 pts
 * 👑 Perfect season
 * 💥 Upset: beat Roger Federer ('06) at 31%
 *
 * A finished season adds its biggest upset (35% or less) and its nemesis, if any.
 * The share button adds the season's link as a last line.
 */
export function seasonShareText(state: SeasonState, you: Pick<Rival, "year" | "name">): string {
  const knockouts = state.knockouts.map(eventEmoji).join("");
  const titles = state.titles.length;
  const record = `${state.record.wins}–${state.record.losses} · ${titles} ${titles === 1 ? "title" : "titles"} · ${fmtScore(state.points)} pts`;
  const { recap } = seasonStories(state);
  const extras = [
    state.done && state.perfect && "👑 Perfect season",
    !state.done && state.perfect && state.record.wins > 0 && "Unbeaten so far",
    state.calendarSlam && "🗓️ Calendar Grand Slam",
    state.done &&
      recap.biggestUpset &&
      recap.biggestUpset.odds <= UPSET_ODDS &&
      `💥 Upset: beat ${who(recap.biggestUpset.opponent)} at ${pct(recap.biggestUpset.odds)}`,
    state.done &&
      recap.nemesis &&
      `😈 Nemesis: ${who(recap.nemesis.rival)}, ${recap.nemesis.wins}–${recap.nemesis.losses}`,
  ].filter(Boolean);
  return [
    `Acedle season · ${you.year} ${you.name}`,
    `${knockouts} ${eventEmoji(state.finals)}`,
    state.done ? record : `${record} (in progress)`,
    ...extras,
  ].join("\n");
}
