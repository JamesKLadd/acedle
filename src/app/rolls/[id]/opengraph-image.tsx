import { ImageResponse } from "next/og";

import { fmtDate, fmtMult, fmtScore, fmtTopPercent } from "@/lib/format";
import { OG, OG_RARITY, OG_SIZE, OgChip, OgFrame, ogFonts, ogImageData } from "@/lib/og";
import { seasonPhoto } from "@/lib/photos";
import { rarityOf } from "@/lib/rarity";
import { getSharedRoll } from "@/lib/roll/shared";
import { topPercent } from "@/lib/scoring/distribution";

export const alt = "A roll on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Link preview card: the season as a trading card, with the score and who rolled it. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const shared = await getSharedRoll((await params).id);
  const fonts = await ogFonts();

  if (!shared) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", marginTop: 110, fontFamily: "Slab", fontSize: 110, color: OG.red }}>
            CARD NOT FOUND
          </div>
          <div style={{ display: "flex", fontSize: 36, color: OG.muted }}>Roll a real ATP season every day.</div>
        </OgFrame>
      ),
      { ...size, fonts },
    );
  }

  const { roll, handle } = shared;
  const { season: s, score } = roll;
  const top = topPercent(score.total);
  const rarity = rarityOf(top);
  const photo = seasonPhoto(s.playerId, s.year);
  const photoData = photo && (await ogImageData(photo.thumb));

  return new ImageResponse(
    (
      <OgFrame aside={fmtDate(roll.day).toUpperCase()}>
        <div style={{ display: "flex", gap: 40, marginTop: 28, flexGrow: 1 }}>
          {/* Photo window, framed like the card's. */}
          <div
            style={{
              display: "flex",
              width: 300,
              height: 380,
              padding: 10,
              background: OG_RARITY[rarity.id],
              border: `5px solid ${OG.ink}`,
              borderRadius: 14,
              boxShadow: "6px 6px 0 rgba(0,0,0,0.2)",
            }}
          >
            {photoData ? (
              <img
                src={photoData}
                alt=""
                width={270}
                height={350}
                style={{ objectFit: "cover", objectPosition: "50% 22%", borderRadius: 6, border: `4px solid ${OG.ink}` }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  background: OG.card,
                  borderRadius: 6,
                  border: `4px solid ${OG.ink}`,
                  fontFamily: "Slab",
                  fontSize: 110,
                  color: OG.blue,
                }}
              >
                {initials(s.name)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, width: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  display: "flex",
                  padding: "2px 18px",
                  background: OG.blue,
                  color: OG.gold,
                  fontFamily: "Slab",
                  fontSize: 44,
                  borderRadius: 6,
                }}
              >
                {String(s.year)}
              </div>
              <OgChip color={OG_RARITY[rarity.id]}>{`${rarity.label} · ${fmtTopPercent(top)}`}</OgChip>
            </div>
            <div style={{ display: "flex", marginTop: 16, fontFamily: "Slab", fontSize: 76, lineHeight: 1 }}>
              {s.name.toUpperCase()}
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 28, color: OG.muted }}>
              {`#${s.ranking.final} · ${s.country} · ${s.matches.wins}–${s.matches.losses} · ${s.titles.length} ${
                s.titles.length === 1 ? "title" : "titles"
              }`}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: "auto",
                padding: "14px 26px",
                background: OG.blue,
                color: OG.cream,
                border: `4px solid ${OG.ink}`,
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", fontSize: 24, letterSpacing: 3 }}>
                {`${score.badges.length} BADGES · ×${fmtMult(score.multiplier).slice(1)} · BY ${(handle ?? "a guest").toUpperCase()}`}
              </div>
              <div style={{ display: "flex", fontFamily: "Slab", fontSize: 84, color: OG.gold, lineHeight: 1.05 }}>
                {fmtScore(score.total)}
              </div>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
