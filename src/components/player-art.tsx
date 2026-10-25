// The default card art for players without a photo: a pictogram server in
// their country's colors, mirrored for left-handers. Plain SVG with fixed
// colors, so the link preview images (satori) can draw it too.

import { countryColors } from "@/lib/country-colors";

const INK = "#1f2233";
const CREAM = "#fff8ec";
const BALL = "#dcef4c";

/**
 * The figure's strokes, drawn twice: a cream halo, then ink on top. A plain
 * function, not a component: satori only draws SVG elements inside <svg>.
 */
function figure(color: string, width: number) {
  const line = { fill: "none", stroke: color, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <g key={color}>
      {/* Legs, body, toss arm, racket arm. */}
      <path d="M48 74 L40 91 L35 108 M48 74 L57 90 L63 107 M48 74 L51 46 M50 47 L41 35 L37 24 M52 47 L64 44 L69 31" {...line} strokeWidth={width} />
      {/* Racket: handle and head. */}
      <path d="M69 31 L72.5 21.5" {...line} strokeWidth={width * 0.7} />
      <ellipse cx={76} cy={11} rx={7} ry={9.5} transform="rotate(20 76 11)" {...line} strokeWidth={width * 0.55} />
      <circle cx={54} cy={34} r={7} fill={color} stroke={color} strokeWidth={width - 7} />
    </g>
  );
}

/** 4:5 art; `hand` "L" mirrors the figure. */
export function PlayerArt({
  hand,
  country,
  className,
  width,
  height,
}: {
  hand: string;
  country: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [main, second] = countryColors(country);
  return (
    <svg viewBox="0 0 100 125" className={className} width={width} height={height} aria-hidden>
      <circle cx={50} cy={60} r={38} fill={main} stroke={INK} strokeWidth={2} />
      <rect x={-2} y={104} width={104} height={23} fill={second} stroke={INK} strokeWidth={2} />
      <path d="M0 113 H100" stroke={second === "#ffffff" ? INK : CREAM} strokeOpacity={0.5} strokeWidth={1.5} />
      <g transform={hand === "L" ? "translate(100 0) scale(-1 1)" : undefined}>
        <g transform="translate(4 7) scale(0.92)">
          {figure(CREAM, 12)}
          {figure(INK, 7)}
          <circle cx={34} cy={13} r={4.5} fill={BALL} stroke={INK} strokeWidth={1.5} />
        </g>
      </g>
    </svg>
  );
}
