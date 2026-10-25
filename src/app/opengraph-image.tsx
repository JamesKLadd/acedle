import { ImageResponse } from "next/og";

import { OG, OG_SIZE, OgFrame, ogFonts } from "@/lib/og";

export const alt = "Acedle: roll today's card";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A card back, for the fan on the right. */
function Back({ rotate, left }: { rotate: number; left: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: 0,
        width: 190,
        height: 270,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: OG.blue,
        border: `5px solid ${OG.ink}`,
        borderRadius: 12,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "6px 6px 0 rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Slab", fontSize: 30, color: OG.gold, letterSpacing: 2 }}>ACEDLE</div>
    </div>
  );
}

/** The site's link preview (pages without their own use it too). */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame aside="SERIES 1990–2026">
        <div style={{ display: "flex", alignItems: "center", flexGrow: 1, gap: 40, marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
            <div style={{ display: "flex", fontFamily: "Slab", fontSize: 96, lineHeight: 0.95, color: OG.red }}>
              ROLL TODAY&apos;S CARD
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: OG.muted }}>
              A real ATP season every day. The player&apos;s results earn the points.
            </div>
          </div>
          <div style={{ display: "flex", position: "relative", width: 380, height: 300 }}>
            <Back rotate={-12} left={20} />
            <Back rotate={12} left={170} />
            <div
              style={{
                position: "absolute",
                left: 95,
                top: -6,
                width: 190,
                height: 270,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: OG.card,
                border: `5px solid ${OG.ink}`,
                borderRadius: 12,
                fontFamily: "Slab",
                fontSize: 130,
                color: OG.red,
              }}
            >
              ?
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
