// Shared look for the link preview images (opengraph-image.tsx files): the
// dark scoreboard panel, court lines, the wordmark, and Barlow Condensed
// (assets/fonts, SIL OFL) for all text.

import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ReactNode } from "react";

import type { Rarity } from "./rarity";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  bg: "#060d1c",
  panel: "#0d1a33",
  line: "#233a63",
  fg: "#eaf0fb",
  muted: "#93a5c6",
  accent: "#d4f53c",
  ink: "#0a1428",
};

/** Dark-theme rarity colors (see globals.css). */
export const OG_RARITY: Record<Rarity, string> = {
  common: "#8da0c2",
  rare: "#5aa2ff",
  epic: "#b08cff",
  legendary: "#f5c542",
  mythic: "#ff6ec7",
};

type Font = { name: string; data: Buffer; weight: 600 | 800; style: "normal" };

let fonts: Promise<Font[]> | undefined;

/** The fonts option for ImageResponse (read once per server). */
export function ogFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    ([
      ["BarlowCondensed-SemiBold.ttf", 600],
      ["BarlowCondensed-ExtraBold.ttf", 800],
    ] as const).map(async ([file, weight]) => ({
      name: "Barlow",
      data: await readFile(join(process.cwd(), "assets/fonts", file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

function Ball({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill={OG.accent} />
      <path
        d="M4.2 4.6c3.6 3.9 3.6 10.9 0 14.8M19.8 4.6c-3.6 3.9-3.6 10.9 0 14.8"
        fill="none"
        stroke={OG.ink}
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CourtLines() {
  return (
    <svg
      width="760"
      height="418"
      viewBox="0 0 400 220"
      fill="none"
      stroke={OG.accent}
      strokeOpacity="0.09"
      strokeWidth="2"
      style={{ position: "absolute", right: -150, bottom: -40 }}
    >
      <rect x="20" y="10" width="360" height="200" />
      <rect x="20" y="35" width="360" height="150" />
      <line x1="200" y1="10" x2="200" y2="210" strokeWidth="3" />
      <line x1="110" y1="35" x2="110" y2="185" />
      <line x1="290" y1="35" x2="290" y2="185" />
      <line x1="110" y1="110" x2="290" y2="110" />
    </svg>
  );
}

/** The frame every card shares: wordmark top left, `aside` top right. */
export function OgFrame({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        padding: "56px 64px",
        background: `linear-gradient(135deg, ${OG.panel} 0%, ${OG.bg} 70%)`,
        color: OG.fg,
        fontFamily: "Barlow",
        fontWeight: 600,
      }}
    >
      <CourtLines />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Ball size={44} />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>ACEDLE</div>
        </div>
        {aside && <div style={{ display: "flex", fontSize: 30, color: OG.muted, letterSpacing: 1 }}>{aside}</div>}
      </div>
      {children}
    </div>
  );
}

/** A rounded pill, e.g. the rarity. */
export function OgChip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 18px",
        borderRadius: 999,
        border: `2px solid ${color}`,
        color,
        fontSize: 28,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
