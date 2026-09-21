import { ImageResponse } from "next/og";
import { SocialCard } from "@/lib/utils/og-image";

export const alt = "Continuum Home — Everything personal, connected";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<SocialCard />, { ...size });
}
