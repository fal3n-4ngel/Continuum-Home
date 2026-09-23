import { ImageResponse } from "next/og";
import { isUatDeployment } from "@/lib/utils";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const isUat = isUatDeployment();
  const boxColor = isUat ? "#DC2626" : "#1c1b18";

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
          backgroundColor: "#f4f3ec",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: boxColor, border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: boxColor, opacity: 0.55, border: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: boxColor, opacity: 0.55, border: "none" }} />
          <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: boxColor, opacity: 0.85, border: "none" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}

