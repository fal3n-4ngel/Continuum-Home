import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
  const primary = "#26211F";
  const accent = isUat ? "#DC2626" : "#D99419";
  const cell = 68;
  const gap = 12;
  const radius = 42;

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
          backgroundColor: "#FAF8F5",
          borderRadius: radius,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: primary }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: accent }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: accent }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: primary }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

