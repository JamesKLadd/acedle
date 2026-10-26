import type { Court } from "@/lib/season/calendar";

/** Each court's colour on the calendar: hard blue, clay terracotta, grass green, indoor violet. */
export const COURT_COLOR: Record<Court, string> = {
  Hard: "#2f6db3",
  Clay: "#c4612f",
  Grass: "#3f8f4a",
  Indoor: "#6b5aa6",
};

export const COURT_LABEL: Record<Court, string> = {
  Hard: "Hard",
  Clay: "Clay",
  Grass: "Grass",
  Indoor: "Indoor hard",
};
