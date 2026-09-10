import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export async function GET() {
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
          backgroundColor: "#f4f3ec",
          borderRadius: radius,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: "#1c1b18" }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: "#1c1b18", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: "#1c1b18", opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: "#1c1b18", opacity: 0.85 }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
