// Shared look for the link preview images (opengraph-image.tsx files): cream
// card stock, the red maker's badge, a gold-and-red striped edge. Alfa Slab
// One for display and Courier Prime for text (assets/fonts, SIL OFL).

import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ReactNode } from "react";

import type { Rarity } from "./rarity";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  bg: "#ebe1cb",
  card: "#fbf6ea",
  line: "#d6c6a3",
  ink: "#1f2233",
  muted: "#685e4b",
  red: "#d63a2f",
  cream: "#fff8ec",
  blue: "#1f4aa0",
  gold: "#f4b81c",
};

/** Light-theme rarity colors (see globals.css). */
export const OG_RARITY: Record<Rarity, string> = {
  common: "#857b66",
  rare: "#1f6cc0",
  epic: "#7843b5",
  legendary: "#c18a05",
  mythic: "#cf2e78",
};

type Font = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };

let fonts: Promise<Font[]> | undefined;

/** The fonts option for ImageResponse (read once per server). Families: "Slab", "Mono". */
export function ogFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    (
      [
        ["Slab", "AlfaSlabOne-Regular.ttf", 400],
        ["Mono", "CourierPrime-Bold.ttf", 700],
      ] as const
    ).map(async ([name, file, weight]) => ({
      name,
      data: await readFile(join(process.cwd(), "assets/fonts", file)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/** An image as a data URL, or null (link previews never fail over a photo). */
export async function ogImageData(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** The red maker's badge with the gold star, tilted. */
export function OgLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.25,
        padding: `${size * 0.12}px ${size * 0.35}px`,
        background: OG.red,
        color: OG.cream,
        border: `4px solid ${OG.ink}`,
        borderRadius: 8,
        boxShadow: `6px 6px 0 ${OG.blue}`,
        transform: "rotate(-3deg)",
        fontFamily: "Slab",
        fontSize: size,
        letterSpacing: 2,
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
        <path d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.6l-6.4 3.5L7 14l-5.3-5 7.2-.9z" fill={OG.gold} />
      </svg>
      ACEDLE
    </div>
  );
}

/** The frame every card shares: logo top left, `aside` top right, a striped bottom edge. */
export function OgFrame({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG.bg,
        color: OG.ink,
        fontFamily: "Mono",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "48px 64px 36px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <OgLogo />
          {aside && <div style={{ display: "flex", fontSize: 28, color: OG.muted, letterSpacing: 2 }}>{aside}</div>}
        </div>
        {children}
      </div>
      <div
        style={{
          display: "flex",
          height: 24,
          borderTop: `4px solid ${OG.ink}`,
          backgroundImage: `repeating-linear-gradient(90deg, ${OG.gold} 0px, ${OG.gold} 18px, ${OG.red} 18px, ${OG.red} 36px)`,
        }}
      />
    </div>
  );
}

/** A rubber-stamp style pill, e.g. the rarity. */
export function OgChip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 16px",
        borderRadius: 6,
        border: `4px solid ${color}`,
        background: OG.card,
        color,
        fontSize: 26,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
