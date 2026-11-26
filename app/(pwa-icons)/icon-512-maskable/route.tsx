import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
  const primary = isUat ? "#DC2626" : "#26211F";
  const accent = isUat ? "#DC2626" : "#D99419";
  const cell = 130;
  const gap = 24;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: isUat ? "#F3EFEA" : "#FAF8F5",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: primary }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: accent, opacity: isUat ? 0.55 : 1 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: accent, opacity: isUat ? 0.55 : 1 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: primary, opacity: isUat ? 0.85 : 1 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

