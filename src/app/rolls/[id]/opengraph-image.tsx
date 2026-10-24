import { ImageResponse } from "next/og";

import { fmtDate, fmtMult, fmtScore, fmtTopPercent } from "@/lib/format";
import { getSharedRoll } from "@/lib/roll/shared";
import { topPercent } from "@/lib/scoring/distribution";

export const alt = "A roll on Acedle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LIME = "#84cc16";
const MUTED = "#a1a1aa";

/** Link preview card: the season, the score and who rolled it. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const shared = await getSharedRoll((await params).id);
  const frame = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    padding: 64,
    background: "#09090b",
    color: "#fafafa",
  };

  if (!shared) {
    return new ImageResponse(
      (
        <div style={{ ...frame, justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>Acedle</div>
          <div style={{ fontSize: 36, color: MUTED }}>Roll a random tennis season every day.</div>
        </div>
      ),
      size,
    );
  }

  const { roll, handle } = shared;
  const { season: s, score } = roll;
  return new ImageResponse(
    (
      <div style={frame}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: MUTED }}>
          <div style={{ display: "flex", color: LIME, fontWeight: 700, letterSpacing: 4 }}>ACEDLE</div>
          <div style={{ display: "flex" }}>{fmtDate(roll.day)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 56, flexGrow: 1 }}>
          <div style={{ display: "flex", fontSize: 44, color: LIME, fontWeight: 700 }}>{s.year}</div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>{s.name}</div>
          <div style={{ display: "flex", fontSize: 34, color: MUTED, marginTop: 12 }}>
            {`#${s.ranking.final} · ${s.country} · ${s.matches.wins}–${s.matches.losses} · ${s.titles.length} titles`}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 28, color: MUTED }}>SCORE</div>
            <div style={{ display: "flex", fontSize: 100, fontWeight: 700, color: LIME, lineHeight: 1 }}>
              {fmtScore(score.total)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 30, color: MUTED }}>
            <div style={{ display: "flex" }}>
              {`${score.badges.length} badges · ${fmtMult(score.multiplier)} · ${fmtTopPercent(topPercent(score.total))}`}
            </div>
            <div style={{ display: "flex", marginTop: 8 }}>{`Rolled by ${handle ?? "a guest"}`}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
