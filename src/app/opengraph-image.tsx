import { ImageResponse } from "next/og";

import { OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Acedle: roll a season, score the stats";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The site's link preview (pages without their own use it too). */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame aside="DAILY TENNIS ROLL">
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 0.9 }}>ROLL A SEASON.</div>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 0.9, color: OG.accent }}>
            SCORE THE STATS.
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 40, color: OG.muted, maxWidth: 900 }}>
          One roll a day from every ATP season since 1990. Real results, real badges, one score.
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
