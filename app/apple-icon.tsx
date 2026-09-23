import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const isUat = isUatDeployment();

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
          position: "relative",
          gap: "10px",
          backgroundColor: isUat ? "#18191D" : "#1c1b18",
          border: isUat ? "6px solid #DC2626" : "none",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: isUat ? "#DC2626" : "#ffffff", border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: isUat ? "#DC2626" : "#ffffff", opacity: 0.55, border: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: isUat ? "#DC2626" : "#ffffff", opacity: 0.55, border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: isUat ? "#DC2626" : "#ffffff", opacity: 0.85, border: "none" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

