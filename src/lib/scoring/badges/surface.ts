import type { PlayerSeason, Surface } from "../../data/types";
import type { BadgeDef } from "../types";
import { perEach, plural, wonTitle } from "./helpers";

const surfaceTitles = (unit: number, surface: Surface) => (s: PlayerSeason) => {
  const n = s.titles.filter((t) => t.surface === surface).length;
  return perEach(n, unit, plural(n, `${surface.toLowerCase()} title`));
};

const ROLAND_GARROS = "520";
const WIMBLEDON = "540";
const INDIAN_WELLS = "404";
const MIAMI = "403";

export const surfaceBadges: BadgeDef[] = [
  {
    id: "clay_titles",
    name: "Clay Court King",
    category: "surface",
    description: "20 bonus points per clay title.",
    evaluate: surfaceTitles(20, "Clay"),
  },
  {
    id: "grass_titles",
    name: "Grass Master",
    category: "surface",
    description: "30 bonus points per grass title.",
    evaluate: surfaceTitles(30, "Grass"),
  },
  {
    id: "hard_titles",
    name: "Hard Court Hero",
    category: "surface",
    description: "15 bonus points per hard-court title.",
    evaluate: surfaceTitles(15, "Hard"),
  },
  {
    id: "carpet_title",
    name: "Carpet Era",
    category: "surface",
    description: "Won a title on carpet, a surface retired from the tour in 2009.",
    evaluate: (s) => {
      const n = s.titles.filter((t) => t.surface === "Carpet").length;
      return n > 0 ? { points: 40, count: n, detail: plural(n, "carpet title") } : null;
    },
  },
  {
    id: "all_surface",
    name: "All-Surface",
    category: "surface",
    description: "Won titles on three or more different surfaces.",
    evaluate: (s) => {
      const surfaces = new Set(s.titles.map((t) => t.surface).filter(Boolean));
      return surfaces.size >= 3 ? { points: 150, detail: [...surfaces].join(", ") } : null;
    },
  },
  {
    id: "sunshine_double",
    name: "Sunshine Double",
    category: "surface",
    description: "Won Indian Wells and Miami in the same season.",
    evaluate: (s) =>
      wonTitle(s, INDIAN_WELLS) && wonTitle(s, MIAMI) ? { points: 200, detail: "Indian Wells + Miami" } : null,
  },
  {
    id: "channel_slam",
    name: "Channel Slam",
    category: "jackpot",
    description: "Won Roland Garros and Wimbledon in the same season.",
    evaluate: (s) =>
      wonTitle(s, ROLAND_GARROS) && wonTitle(s, WIMBLEDON)
        ? { multiplier: 1.5, detail: "Roland Garros + Wimbledon" }
        : null,
  },
];
