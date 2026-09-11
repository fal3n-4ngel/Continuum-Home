"use client";

import React, { useState, useMemo } from "react";
import { CategorySegment } from "./CategorySegmentedBar";

export interface PeriodEvolutionData {
  id: string;
  label: string;
  fullLabel: string;
  totalSpend: number;
  incomeOrBudget: number;
  isCurrent?: boolean;
  segments: CategorySegment[];
}

interface PeriodEvolutionChartProps {
  periods: PeriodEvolutionData[];
  mode: "percentage" | "amount";
  currency: string;
  selectedPeriodId?: string;
  onSelectPeriod?: (id: string) => void;
}

export const PeriodEvolutionChart: React.FC<PeriodEvolutionChartProps> = ({
  periods,
  mode,
  currency,
  selectedPeriodId,
  onSelectPeriod,
}) => {
  const [hoveredPeriodId, setHoveredPeriodId] = useState<string | null>(null);

  const displayPeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    const withData = periods.filter((p) => p.totalSpend > 0 || p.isCurrent);
    return withData.length > 0 ? withData : periods;
  }, [periods]);

  if (!displayPeriods || displayPeriods.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-primary/40 text-xs text-text-muted">
        No historical cycle data available.
      </div>
    );
  }

  const maxSpend = Math.max(...displayPeriods.map((p) => p.totalSpend || 0), 100);

  const yTicks = mode === "percentage"
    ? [100, 80, 60, 40, 20]
    : [
        Math.round(maxSpend),
        Math.round(maxSpend * 0.8),
        Math.round(maxSpend * 0.6),
        Math.round(maxSpend * 0.4),
        Math.round(maxSpend * 0.2),
      ];

  const activePeriod = displayPeriods.find((p) => p.id === (hoveredPeriodId || selectedPeriodId));

  return (
    <div className="flex flex-col gap-3 w-full">
      {activePeriod && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border-subtle/80 bg-bg-secondary px-3.5 py-2 text-xs transition-all shadow-2xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-semibold text-text-primary">{activePeriod.fullLabel}</span>
            {activePeriod.isCurrent && (
              <span className="rounded bg-bg-primary border border-border-subtle px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase text-text-secondary">
                Current
              </span>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            <span className="font-mono font-medium text-text-secondary">
              Spend: <span className="font-semibold text-text-primary">{currency}{Math.round(activePeriod.totalSpend).toLocaleString("en-IN")}</span>
            </span>
            {activePeriod.incomeOrBudget > 0 && (
              <span className="font-mono text-text-muted">
                Budget: {currency}{Math.round(activePeriod.incomeOrBudget).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
        <div className={`relative flex h-72 w-full pt-4 pb-9 pl-10 pr-2 ${
          displayPeriods.length > 7 ? "min-w-[440px] sm:min-w-0" : "min-w-0"
        }`}>
          <div className="absolute inset-y-4 left-0 flex flex-col justify-between text-right text-[10px] font-mono text-text-muted pr-2 select-none z-20">
            {yTicks.map((tick, i) => (
              <span key={i} className="leading-none">
                {mode === "percentage" ? `${tick}%` : `${currency}${tick >= 1000 ? `${Math.round(tick / 1000)}k` : tick}`}
              </span>
            ))}
            <span className="leading-none">0</span>
          </div>

          <div className="absolute inset-x-10 top-4 bottom-9 flex flex-col justify-between pointer-events-none z-0">
            {yTicks.map((_, i) => (
              <div key={i} className="w-full border-b border-border-subtle/35" />
            ))}
            <div className="w-full border-b border-border-subtle" />
          </div>

          <div className="relative flex h-full w-full items-end justify-between gap-1.5 sm:gap-3 z-10">
            {displayPeriods.map((period) => {
              const isSelected = selectedPeriodId === period.id;
              const isHovered = hoveredPeriodId === period.id;

              const barHeightPct = mode === "percentage"
                ? (period.totalSpend > 0 ? 100 : 0)
                : Math.min(100, Math.max(4, (period.totalSpend / maxSpend) * 100));

              return (
                <div
                  key={period.id}
                  className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                  onMouseEnter={() => setHoveredPeriodId(period.id)}
                  onMouseLeave={() => setHoveredPeriodId(null)}
                  onClick={() => onSelectPeriod && onSelectPeriod(period.id)}
                >
                  <div
                    className={`relative flex w-full max-w-[42px] flex-col justify-end overflow-hidden rounded-t-md transition-all duration-200 ${
                      isSelected
                        ? "ring-2 ring-text-primary ring-offset-2 ring-offset-bg-card"
                        : isHovered
                        ? "scale-[1.02] shadow-sm"
                        : "opacity-90 hover:opacity-100"
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  >
                    {period.segments.map((seg, sIdx) => {
                      const segHeight = mode === "percentage"
                        ? `${seg.percentage}%`
                        : `${(seg.amount / (period.totalSpend || 1)) * 100}%`;

                      return (
                        <div
                          key={seg.category || sIdx}
                          style={{
                            height: segHeight,
                            backgroundColor: seg.color,
                          }}
                          className="w-full transition-all"
                          title={`${seg.category}: ${currency}${Math.round(seg.amount).toLocaleString("en-IN")} (${seg.percentage}%)`}
                        />
                      );
                    })}
                  </div>

                  <div className="absolute -bottom-7 flex flex-col items-center pointer-events-none select-none">
                    {period.label.includes(" ") ? (
                      <>
                        <span className="font-mono text-[8px] text-text-muted leading-none">
                          {period.label.split(" ")[0]}
                        </span>
                        <span
                          className={`font-mono text-[9px] sm:text-[10px] tracking-tight uppercase leading-tight transition-colors ${
                            isSelected
                              ? "font-bold text-text-primary"
                              : isHovered
                              ? "text-text-primary"
                              : "text-text-muted"
                          }`}
                        >
                          {period.label.split(" ")[1]}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`font-mono text-[9px] sm:text-[10px] tracking-tight uppercase transition-colors ${
                          isSelected
                            ? "font-bold text-text-primary"
                            : isHovered
                            ? "text-text-primary"
                            : "text-text-muted"
                        }`}
                      >
                        {period.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
