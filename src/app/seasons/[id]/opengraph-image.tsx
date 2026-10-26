import { ImageResponse } from "next/og";

import { PlayerArt } from "@/components/player-art";
import { fmtScore } from "@/lib/format";
import { OG, OG_SIZE, OgChip, OgFrame, ogFonts, ogImageData } from "@/lib/og";
import { getSharedRoll } from "@/lib/roll/shared";
import { seasonState } from "@/lib/season/season";
import { eventEmoji } from "@/lib/season/share";
import { getSeason } from "@/lib/season/store";
import { getSeasonPhoto } from "@/lib/season-photo";

export const alt = "A season on Acedle";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Each event's square, by how far the player got (as the share text's emoji). */
const SQUARE: Record<string, string> = {
  "🏆": OG.gold,
  "🥈": "#c7d0dd",
  "🥉": "#c98a54",
  "🎾": OG.blue,
  "⬜": OG.line,
};

/** Link preview for a season: the card, its record and a square per event. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const fonts = await ogFonts();
  const season = await getSeason((await params).id);
  const shared = season && (await getSharedRoll(season.rollId));
  if (!season || !shared) {
    return new ImageResponse(
      (
        <OgFrame>
          <div style={{ display: "flex", marginTop: 110, fontFamily: "Slab", fontSize: 100, color: OG.red }}>
            SEASON NOT FOUND
          </div>
        </OgFrame>
      ),
      { ...size, fonts },
    );
  }

  const card = shared.roll.season;
  const state = seasonState(season.setup, season.sets);
  const photo = await getSeasonPhoto(card.playerId, card.year);
  const photoData = photo && (await ogImageData(photo.thumb));
  const squares = [...state.knockouts, state.finals].map(eventEmoji);
  const titles = state.titles.length;
  const status = season.status === "abandoned" ? "UNFINISHED" : state.done ? "FINAL RECORD" : "IN PROGRESS";

  return new ImageResponse(
    (
      <OgFrame aside="SEASON MODE">
        <div style={{ display: "flex", gap: 40, marginTop: 28, flexGrow: 1 }}>
          <div
            style={{
              display: "flex",
              width: 300,
              height: 380,
              padding: 10,
              background: state.done && state.perfect ? OG.gold : OG.blue,
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
                  background: OG.card,
                  borderRadius: 6,
                  border: `4px solid ${OG.ink}`,
                  overflow: "hidden",
                }}
              >
                <PlayerArt hand={card.hand} country={card.country} width={272} height={340} />
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
                {String(card.year)}
              </div>
              <OgChip color={state.done && state.perfect ? "#c18a05" : OG.muted}>
                {state.done && state.perfect ? "PERFECT SEASON" : status}
              </OgChip>
            </div>
            <div style={{ display: "flex", marginTop: 16, fontFamily: "Slab", fontSize: 68, lineHeight: 1 }}>
              {card.name.toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
              {squares.map((sq, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    width: i === squares.length - 1 ? 44 : 36,
                    height: 36,
                    marginLeft: i === squares.length - 1 ? 10 : 0,
                    background: SQUARE[sq],
                    border: `3px solid ${OG.ink}`,
                    borderRadius: 6,
                  }}
                />
              ))}
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
                {`${titles} ${titles === 1 ? "TITLE" : "TITLES"} · ${fmtScore(state.points)} PTS${
                  state.calendarSlam ? " · CALENDAR SLAM" : ""
                } · BY ${(shared.handle ?? "a guest").toUpperCase()}`}
              </div>
              <div style={{ display: "flex", fontFamily: "Slab", fontSize: 84, color: OG.gold, lineHeight: 1.05 }}>
                {`${state.record.wins}–${state.record.losses}`}
              </div>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts },
  );
}
