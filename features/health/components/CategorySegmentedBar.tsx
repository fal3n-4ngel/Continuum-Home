"use client";

import React from "react";

export interface CategorySegment {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CategorySegmentedBarProps {
  segments: CategorySegment[];
  currency: string;
  height?: number;
}

export const CategorySegmentedBar: React.FC<CategorySegmentedBarProps> = ({
  segments,
  currency,
  height = 16,
}) => {
  if (!segments || segments.length === 0) {
    return (
      <div
        className="w-full rounded-full bg-bg-secondary border border-border-subtle"
        style={{ height: `${height}px` }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div
        className="flex w-full overflow-hidden rounded-full border border-border-subtle/60 bg-bg-secondary p-0.5 shadow-2xs"
        style={{ height: `${height}px` }}
      >
        {segments.map((s, idx) => (
          <div
            key={s.category || idx}
            style={{
              width: `${Math.max(1.5, s.percentage)}%`,
              backgroundColor: s.color,
            }}
            className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 relative group"
            title={`${s.category}: ${currency}${s.amount.toLocaleString("en-IN")} (${s.percentage}%)`}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs">
        {segments.map((s) => (
          <div key={s.category} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-medium text-text-primary text-[11.5px]">{s.category}</span>
            <span className="font-mono text-[10.5px] text-text-muted">
              {currency}{Math.round(s.amount).toLocaleString("en-IN")} ({s.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
