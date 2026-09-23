import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
  const cell = 182;
  const gap = 32;
  const radius = 112;

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
          backgroundColor: isUat ? "#18191D" : "#f4f3ec",
          borderRadius: radius,
          border: isUat ? "14px solid #DC2626" : "none",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#DC2626" : "#1c1b18" }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#DC2626" : "#1c1b18", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#DC2626" : "#1c1b18", opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#DC2626" : "#1c1b18", opacity: 0.85 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

