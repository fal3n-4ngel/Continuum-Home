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
          border: isUat ? "14px solid #D97706" : "none",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#D97706" : "#1c1b18" }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 42, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.85 }} />
          </div>
        </div>
        {isUat && (
          <div
            style={{
              position: "absolute",
              bottom: "32px",
              right: "36px",
              backgroundColor: "#D97706",
              color: "#ffffff",
              fontSize: "44px",
              fontWeight: 900,
              padding: "6px 22px",
              borderRadius: "14px",
              letterSpacing: "3px",
              fontFamily: "monospace",
            }}
          >
            UAT
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}

