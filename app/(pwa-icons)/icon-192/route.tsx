import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
  const boxColor = isUat ? "#DC2626" : "#1c1b18";
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
          backgroundColor: "#f4f3ec",
          borderRadius: radius,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: boxColor }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: boxColor, opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: boxColor, opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: boxColor, opacity: 0.85 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

