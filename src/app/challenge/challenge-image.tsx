import { ImageResponse } from "next/og";

import { PlayerArt } from "@/components/player-art";
import { OG, OG_SIZE, OgChip, OgFrame, ogFonts, ogImageData } from "@/lib/og";
import type { StoredChallenge } from "@/lib/challenge-store";
import { getSeasonPhoto } from "@/lib/season-photo";
import { tierFormat, tierOf } from "@/lib/tournament";

/** Link preview for a day's challenge: the card, the tier and the draw it's in. */
export async function challengeImage(challenge: StoredChallenge | null) {
  const fonts = await ogFonts();
  if (!challenge) {
    return new ImageResponse(
      (
        <OgFrame aside="DAILY CHALLENGE">
          <div style={{ display: "flex", marginTop: 110, fontFamily: "Slab", fontSize: 96, color: OG.red }}>
            CHALLENGE NOT FOUND
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, fonts },
    );
  }

  const { card, setup } = challenge;
  const tier = tierOf(challenge.tier);
  const photo = await getSeasonPhoto(card.playerId, card.year);
  const photoData = photo && (await ogImageData(photo.thumb));

  return new ImageResponse(
    (
      <OgFrame aside="DAILY CHALLENGE">
        <div style={{ display: "flex", gap: 40, marginTop: 28, flexGrow: 1 }}>
          <div
            style={{
              display: "flex",
              width: 300,
              height: 380,
              padding: 10,
              background: OG.blue,
              border: `5px solid ${OG.ink}`,
              borderRadius: 14,
              boxShadow: "6px 6px 0 rgba(0,0,0,0.2)",
            }}
          >
            {photoData ? (
              // Rendered by next/og into a PNG, not by a browser.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoData}
                alt=""
                width={270}
                height={350}
                style={{ objectFit: "cover", objectPosition: "50% 22%", borderRadius: 6, border: `4px solid ${OG.ink}` }}
              />
            ) : (
              <div style={{ display: "flex", background: OG.card, borderRadius: 6, border: `4px solid ${OG.ink}`, overflow: "hidden" }}>
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
              <OgChip color={OG.red}>{`#${challenge.number} · ${tier.name.toUpperCase()}`}</OgChip>
            </div>
            <div style={{ display: "flex", marginTop: 16, fontFamily: "Slab", fontSize: 68, lineHeight: 1 }}>
              {card.name.toUpperCase()}
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 26, color: OG.muted }}>
              {`Seed ${setup.entrants[setup.you].seed} of ${tier.size} · ${tierFormat(tier).split(" · ")[1]}`}
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
              <div style={{ display: "flex", fontSize: 24, letterSpacing: 3 }}>SAME CARD, SAME DRAW FOR EVERYONE</div>
              <div style={{ display: "flex", fontFamily: "Slab", fontSize: 50, color: OG.gold, lineHeight: 1.1 }}>
                HOW FAR CAN YOU GO?
              </div>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
