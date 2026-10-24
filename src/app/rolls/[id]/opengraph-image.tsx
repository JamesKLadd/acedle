import { ImageResponse } from "next/og";

import { fmtDate, fmtMult, fmtScore, fmtTopPercent } from "@/lib/format";
import { OG, OG_RARITY, OG_SIZE, OgChip, OgFrame, ogFonts } from "@/lib/og";
import { rarityOf } from "@/lib/rarity";
import { getSharedRoll } from "@/lib/roll/shared";
import { topPercent } from "@/lib/scoring/distribution";

export const alt = "A roll on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Link preview card: the season, the score and who rolled it. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const shared = await getSharedRoll((await params).id);
  const fonts = await ogFonts();

  if (!shared) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", marginTop: 120, fontSize: 120, fontWeight: 800 }}>ROLL NOT FOUND</div>
          <div style={{ display: "flex", fontSize: 40, color: OG.muted }}>Roll a random tennis season every day.</div>
        </OgFrame>
      ),
      { ...size, fonts },
    );
  }

  const { roll, handle } = shared;
  const { season: s, score } = roll;
  const top = topPercent(score.total);
  const rarity = rarityOf(top);
  const color = OG_RARITY[rarity.id];

  return new ImageResponse(
    (
      <OgFrame aside={fmtDate(roll.day).toUpperCase()}>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36, flexGrow: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: OG.accent }}>{String(s.year)}</div>
            <OgChip color={color}>{`${rarity.label} · ${fmtTopPercent(top)}`}</OgChip>
          </div>
          <div style={{ display: "flex", fontSize: 108, fontWeight: 800, lineHeight: 0.95, textTransform: "uppercase" }}>
            {s.name}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: OG.muted, marginTop: 14 }}>
            {`#${s.ranking.final} · ${s.country} · ${s.matches.wins}–${s.matches.losses} · ${s.titles.length} ${
              s.titles.length === 1 ? "title" : "titles"
            } · rolled by ${handle ?? "a guest"}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 36px",
            borderRadius: 26,
            background: OG.bg,
            border: `2px solid ${OG.line}`,
          }}
        >
          <div style={{ display: "flex", gap: 48, fontSize: 30, color: OG.muted, letterSpacing: 2 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex" }}>BADGES</div>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: OG.fg }}>{String(score.badges.length)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex" }}>MULT</div>
              <div style={{ display: "flex", fontSize: 52, fontWeight: 800, color: OG.fg }}>{fmtMult(score.multiplier)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 30, color: OG.muted, letterSpacing: 2 }}>SCORE</div>
            <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1, color: OG.accent }}>
              {fmtScore(score.total)}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
