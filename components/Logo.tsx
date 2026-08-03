import React from "react";
import { SITE_NAME } from "@/lib/site";

// Single source of truth for the Continuum "bento grid" brand mark — a 2x2 grid
// of rounded squares (top-left solid, top-right & bottom-left muted, bottom-
// right accented). Every in-app usage (Sidebar, MobileHeader, OnboardingModal,
// LandingPage, assistant setup page) should render this instead of a
// hand-copied SVG, so a design tweak only needs to happen in one place.
//
// The generated favicon/apple-icon/OG-image routes (app/icon.tsx,
// app/apple-icon.tsx, lib/og-image.tsx) intentionally do NOT import this —
// they run through next/og's ImageResponse (satori), a separate rendering
// engine with its own constraints, but already mirror the same geometry.
interface LogoMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

export function LogoMark({ size = 22, color = "currentColor", className }: LogoMarkProps) {
  const gap = size * 0.08;
  const cell = (size - gap * 3) / 2;
  const r = size * 0.12;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* top-left */}
      <rect x={gap} y={gap} width={cell} height={cell} rx={r} fill={color} />
      {/* top-right */}
      <rect x={gap * 2 + cell} y={gap} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      {/* bottom-left */}
      <rect x={gap} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      {/* bottom-right */}
      <rect x={gap * 2 + cell} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.85" />
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  showWordmark?: boolean;
  wordmarkClassName?: string;
  gap?: number;
}

// Mark + SITE_NAME wordmark, for header/nav contexts.
export function Logo({ size = 22, color = "currentColor", className, showWordmark = true, wordmarkClassName = "text-base font-medium tracking-tight text-text-primary", gap = 10 }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap }} className={className}>
      <LogoMark size={size} color={color} />
      {showWordmark && <span className={wordmarkClassName}>{SITE_NAME}</span>}
    </div>
  );
}
