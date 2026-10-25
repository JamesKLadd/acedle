import { ImageResponse } from "next/og";

import { OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export interface BoardImageRow {
  rank: number;
  name: string;
  detail: string;
  value: string;
}

const MEDAL = ["#f4b81c", "#c7d0dd", "#c98a54"];

/** Link preview for a leaderboard: its title and top three. */
export async function boardImage({ title, aside, rows }: { title: string; aside: string; rows: BoardImageRow[] }) {
  return new ImageResponse(
    (
      <OgFrame aside={aside.toUpperCase()}>
        <div style={{ display: "flex", marginTop: 36, fontFamily: "Slab", fontSize: 76, color: OG.red }}>
          {title.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          {rows.length === 0 ? (
            <div style={{ display: "flex", fontSize: 40, color: OG.muted }}>No rolls yet. Be the first.</div>
          ) : (
            rows.slice(0, 3).map((e, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: OG.card,
                  border: `4px solid ${e.rank === 1 ? OG.ink : OG.line}`,
                  boxShadow: `5px 5px 0 ${e.rank === 1 ? OG.blue : OG.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 60,
                    height: 60,
                    borderRadius: 999,
                    border: `4px solid ${OG.ink}`,
                    background: MEDAL[e.rank - 1] ?? OG.line,
                    color: OG.ink,
                    fontFamily: "Slab",
                    fontSize: 32,
                  }}
                >
                  {String(e.rank)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                  <div style={{ display: "flex", fontFamily: "Slab", fontSize: 38 }}>{e.name}</div>
                  <div style={{ display: "flex", fontSize: 26, color: OG.muted }}>{e.detail}</div>
                </div>
                <div style={{ display: "flex", fontFamily: "Slab", fontSize: 50, color: e.rank === 1 ? OG.red : OG.ink }}>
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
