import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export async function GET() {
  const isUat = isUatDeployment();
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
          backgroundColor: isUat ? "#18191D" : "#f4f3ec",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap }}>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: isUat ? "#D97706" : "#1c1b18" }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
          </div>
          <div style={{ display: "flex", gap }}>
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.55 }} />
            <div style={{ display: "flex", width: cell, height: cell, borderRadius: 30, backgroundColor: isUat ? "#D97706" : "#1c1b18", opacity: 0.85 }} />
          </div>
        </div>
        {isUat && (
          <div
            style={{
              position: "absolute",
              bottom: "48px",
              backgroundColor: "#D97706",
              color: "#ffffff",
              fontSize: "36px",
              fontWeight: 900,
              padding: "4px 20px",
              borderRadius: "12px",
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

