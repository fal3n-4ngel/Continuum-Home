import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const isUat = isUatDeployment();
  const primary = "#26211F";
  const accent = isUat ? "#DC2626" : "#D99419";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          backgroundColor: "#FAF8F5",
          borderRadius: "6px",
        }}
      >
        <div style={{ display: "flex", gap: "2px" }}>
          <div style={{ display: "flex", width: "11px", height: "11px", borderRadius: "3px", backgroundColor: primary, border: "none" }} />
          <div style={{ display: "flex", width: "11px", height: "11px", borderRadius: "3px", backgroundColor: accent, border: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          <div style={{ display: "flex", width: "11px", height: "11px", borderRadius: "3px", backgroundColor: accent, border: "none" }} />
          <div style={{ display: "flex", width: "11px", height: "11px", borderRadius: "3px", backgroundColor: primary, border: "none" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

