import { ImageResponse } from "next/og";

import { OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export interface BoardImageRow {
  rank: number;
  name: string;
  detail: string;
  value: string;
}

const MEDAL = ["#f5c542", "#c7d0dd", "#c98a54"];

/** Link preview for a leaderboard: its title and top three. */
export async function boardImage({ title, aside, rows }: { title: string; aside: string; rows: BoardImageRow[] }) {
  return new ImageResponse(
    (
      <OgFrame aside={aside.toUpperCase()}>
        <div style={{ display: "flex", marginTop: 44, fontSize: 84, fontWeight: 800, lineHeight: 1 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 36 }}>
          {rows.length === 0 ? (
            <div style={{ display: "flex", fontSize: 44, color: OG.muted }}>No rolls yet. Be the first.</div>
          ) : (
            rows.slice(0, 3).map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "14px 28px",
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${e.rank === 1 ? MEDAL[0] : OG.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    background: MEDAL[e.rank - 1] ?? OG.line,
                    color: OG.ink,
                    fontSize: 40,
                    fontWeight: 800,
                  }}
                >
                  {String(e.rank)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <div style={{ display: "flex", fontSize: 44, fontWeight: 800, lineHeight: 1.05 }}>{e.name}</div>
                  <div style={{ display: "flex", fontSize: 28, color: OG.muted }}>{e.detail}</div>
                </div>
                <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: e.rank === 1 ? OG.accent : OG.fg }}>
                  {e.value}
                </div>
              </div>
            ))
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
