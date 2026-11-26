import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const isUat = isUatDeployment();
  const primary = isUat ? "#DC2626" : "#26211F";
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
          gap: "10px",
          backgroundColor: isUat ? "#F3EFEA" : "#FAF8F5",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "14px", backgroundColor: primary, border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "14px", backgroundColor: accent, opacity: isUat ? 0.55 : 1, border: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "14px", backgroundColor: accent, opacity: isUat ? 0.55 : 1, border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "14px", backgroundColor: primary, opacity: isUat ? 0.85 : 1, border: "none" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

