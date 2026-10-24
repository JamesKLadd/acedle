import type { BadgeDef } from "../types";
import { fmtPts, multEach, perEach, plural, pts, slamsAt, titlesIn } from "./helpers";

export const SLAM_MULTIPLIER = 1.4;
export const MASTERS_MULTIPLIER = 1.1;

export const titleBadges: BadgeDef[] = [
  {
    id: "titlist",
    name: "Titlist",
    category: "titles",
    description: `${fmtPts(50)} points per tour-level title.`,
    evaluate: (s) => perEach(s.titles.length, 50, plural(s.titles.length, "title")),
  },
  {
    id: "slam_champion",
    name: "Grand Slam Champion",
    category: "titles",
    description: `×${SLAM_MULTIPLIER} per major title. Stacks.`,
    evaluate: (s) => {
      const names = s.titles.filter((t) => t.category === "slam").map((t) => t.name);
      return multEach(titlesIn(s, "slam"), SLAM_MULTIPLIER, names.join(", "));
    },
  },
  {
    id: "masters_champion",
    name: "Masters Champion",
    category: "titles",
    description: `×${MASTERS_MULTIPLIER} per Masters 1000 title. Stacks.`,
    evaluate: (s) => {
      const n = titlesIn(s, "masters");
      return multEach(n, MASTERS_MULTIPLIER, plural(n, "Masters title"));
    },
  },
  {
    id: "tour_finals_champion",
    name: "Year-End Champion",
    category: "titles",
    description: "Won the season-ending Tour Finals. ×1.25.",
    evaluate: (s) => (titlesIn(s, "finals") > 0 ? { multiplier: 1.25, detail: "Tour Finals champion" } : null),
  },
  {
    id: "olympic_gold",
    name: "Olympic Gold",
    category: "titles",
    description: "Won Olympic singles gold. ×1.25.",
    evaluate: (s) => {
      const gold = s.titles.find((t) => t.category === "olympics");
      return gold ? { multiplier: 1.25, detail: gold.name } : null;
    },
  },
  {
    id: "finalist",
    name: "Finalist",
    category: "titles",
    description: `${fmtPts(15)} points per non-major final lost.`,
    evaluate: (s) => {
      const n = s.finalsLost.filter((f) => f.category !== "slam").length;
      return perEach(n, 15, plural(n, "final") + " lost");
    },
  },
  {
    id: "slam_finalist",
    name: "Slam Finalist",
    category: "titles",
    description: `${fmtPts(120)} points per major final lost.`,
    evaluate: (s) => {
      const names = s.slams.filter((r) => r.round === "F").map((r) => r.name);
      return perEach(names.length, 120, `Runner-up: ${names.join(", ")}`);
    },
  },
  {
    id: "slam_semifinalist",
    name: "Deep Run",
    category: "titles",
    description: `${fmtPts(60)} points per major semifinal lost.`,
    evaluate: (s) => perEach(slamsAt(s, "SF"), 60, plural(slamsAt(s, "SF"), "major semifinal")),
  },
  {
    id: "slam_quarterfinalist",
    name: "Second Week",
    category: "titles",
    description: `${fmtPts(25)} points per major quarterfinal lost.`,
    evaluate: (s) => perEach(slamsAt(s, "QF"), 25, plural(slamsAt(s, "QF"), "major quarterfinal")),
  },
  {
    id: "maiden_title",
    name: "Maiden Voyage",
    category: "titles",
    description: "First career title came this season.",
    evaluate: (s) => {
      if (!s.maidenTitle) return null;
      const first = [...s.titles].sort((a, b) => a.date - b.date)[0];
      return { points: pts(75), detail: `First title: ${first.name}` };
    },
  },
  {
    id: "title_defense",
    name: "Title Defense",
    category: "titles",
    description: `${fmtPts(40)} points per title also won the season before.`,
    evaluate: (s) => {
      const names = s.titles.filter((t) => s.defendedTitles.includes(t.code)).map((t) => t.name);
      return perEach(s.defendedTitles.length, 40, [...new Set(names)].join(", "));
    },
  },
  {
    id: "qualifier_champion",
    name: "From the Qualies",
    category: "titles",
    description: `${fmtPts(150)} points per title won after coming through qualifying.`,
    evaluate: (s) => {
      const won = s.titles.filter((t) => t.entry === "Q");
      return perEach(won.length, 150, won.map((t) => t.name).join(", "));
    },
  },
  {
    id: "wildcard_champion",
    name: "Wildcard Wonder",
    category: "titles",
    description: `${fmtPts(100)} points per title won as a wildcard.`,
    evaluate: (s) => {
      const won = s.titles.filter((t) => t.entry === "WC");
      return perEach(won.length, 100, won.map((t) => t.name).join(", "));
    },
  },
  {
    id: "lucky_loser_champion",
    name: "Luckiest Loser",
    category: "titles",
    description: `${fmtPts(250)} points per title won as a lucky loser.`,
    evaluate: (s) => {
      const won = s.titles.filter((t) => t.entry === "LL");
      return perEach(won.length, 250, won.map((t) => t.name).join(", "));
    },
  },
];
