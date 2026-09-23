import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
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
          backgroundColor: isUat ? "#18191D" : "#f4f3ec",
          borderRadius: radius,
          border: isUat ? "5px solid #D97706" : "none",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: isUat ? "#D97706" : "#1c1b18" }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 16, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.85 }} />
          </div>
        </div>
        {isUat && (
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              right: "14px",
              backgroundColor: "#D97706",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 900,
              padding: "2px 8px",
              borderRadius: "6px",
              letterSpacing: "1px",
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

