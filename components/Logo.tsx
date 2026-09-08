import React from "react";
import { SITE_NAME } from "@/lib/utils";

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
      <rect x={gap} y={gap} width={cell} height={cell} rx={r} fill={color} />
      <rect x={gap * 2 + cell} y={gap} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      <rect x={gap} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.55" />
      <rect x={gap * 2 + cell} y={gap * 2 + cell} width={cell} height={cell} rx={r} fill={color} opacity="0.85" />
    </svg>
  );
}

interface LogoProps extends LogoMarkProps {
  showWordmark?: boolean;
  wordmarkClassName?: string;
  gap?: number;
}

export function Logo({ size = 22, color = "currentColor", className, showWordmark = true, wordmarkClassName = "text-base font-medium tracking-tight text-text-primary", gap = 10 }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap }} className={className}>
      <LogoMark size={size} color={color} />
      {showWordmark && <span className={wordmarkClassName}>{SITE_NAME}</span>}
    </div>
  );
}
