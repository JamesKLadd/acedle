import type { BadgeDef } from "../types";

export const profileBadges: BadgeDef[] = [
  {
    id: "teen_phenom",
    name: "Teen Phenom",
    category: "profile",
    description: "Under 20 at the end of the season.",
    evaluate: (s) => (s.age !== null && s.age < 20 ? { points: 80, detail: `Age ${s.age}` } : null),
  },
  {
    id: "veteran",
    name: "Wily Veteran",
    category: "profile",
    description: "33 or older at the end of the season.",
    evaluate: (s) => (s.age !== null && s.age >= 33 ? { points: 60, detail: `Age ${s.age}` } : null),
  },
  {
    id: "lefty",
    name: "Lefty",
    category: "profile",
    description: "Plays left-handed.",
    evaluate: (s) => (s.hand === "L" ? { points: 10, detail: "Left-handed" } : null),
  },
  {
    id: "skyscraper",
    name: "Skyscraper",
    category: "profile",
    description: "198 cm (6'6\") or taller.",
    evaluate: (s) =>
      s.heightCm !== null && s.heightCm >= 198 ? { points: 15, detail: `${s.heightCm} cm` } : null,
  },
];
