"use client";

import React, { useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  ShieldCheck,
  Home,
  Car,
  Utensils,
  Receipt,
  Clock,
} from "lucide-react";
import { PeriodEvolutionData } from "./PeriodEvolutionChart";
import type { ExpenseItem } from "./HistoricalAnalyticsView";

interface HistoricalAiSummaryProps {
  periods: PeriodEvolutionData[];
  expenses?: ExpenseItem[];
  dimension: "cycle" | "month";
  currency: string;
  isProUser: boolean;
  onClaimPro?: () => void;
}

interface RecurringCategoryProfile {
  name: string;
  type: string;
  avgAmount: number;
  sharePct: number;
  frequencyPct: number;
  variancePct: number;
  driftPct: number;
  driftLabel: string;
  iconType: "home" | "car" | "utensils" | "receipt";
}

export const HistoricalAiSummary: React.FC<HistoricalAiSummaryProps> = ({
  periods,
  expenses,
  dimension,
  currency,
  isProUser,
  onClaimPro,
}) => {
  const stats = useMemo(() => {
    const active = periods.filter((p) => p.totalSpend > 0);
    if (active.length === 0) {
      return {
        hasData: false,
        inProgressPeriod: null as PeriodEvolutionData | null,
        completedPeriodsCount: 0,
        avgSpend: 0,
        avgBudget: 0,
        avgAdherence: 0,
        trendDeltaPct: 0,
        trendStatus: "No Data",
        trendSeverity: "neutral" as const,
        trendDescription: "Record transactions across multiple periods to generate AI spend trajectory insights.",
        dominantCategory: null as { name: string; amount: number; pct: number } | null,
        peakPeriod: null as PeriodEvolutionData | null,
        lowestPeriod: null as PeriodEvolutionData | null,
        recurringProfiles: [] as RecurringCategoryProfile[],
        fixedTotalAvg: 0,
        fixedSharePct: 0,
        discretionaryTotalAvg: 0,
        discretionarySharePct: 0,
        recommendations: [] as string[],
      };
    }

    const inProgressPeriod = active.find((p) => p.isCurrent) || null;
    const completedPeriods = active.filter((p) => !p.isCurrent);
    const basePeriods = completedPeriods.length > 0 ? completedPeriods : active;

    const totalSpendSum = basePeriods.reduce((sum, p) => sum + p.totalSpend, 0);
    const totalBudgetSum = basePeriods.reduce((sum, p) => sum + p.incomeOrBudget, 0);
    const avgSpend = Math.round(totalSpendSum / basePeriods.length);
    const avgBudget = Math.round(totalBudgetSum / basePeriods.length);
    const avgAdherence = avgBudget > 0 ? Math.round((avgSpend / avgBudget) * 100) : 0;

    let trendDeltaPct = 0;
    let trendStatus = "Consistent Pace";
    let trendSeverity: "good" | "neutral" | "warning" = "neutral";
    let trendDescription = "";

    const periodTypeLabel = dimension === "cycle" ? "pay cycles" : "months";

    if (basePeriods.length >= 2) {
      const mid = Math.floor(basePeriods.length / 2);
      const earlier = basePeriods.slice(0, mid);
      const recent = basePeriods.slice(mid);
      const earlierAvg = earlier.reduce((sum, p) => sum + p.totalSpend, 0) / earlier.length;
      const recentAvg = recent.reduce((sum, p) => sum + p.totalSpend, 0) / recent.length;

      if (earlierAvg > 0) {
        trendDeltaPct = Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
      }

      if (trendDeltaPct > 6) {
        trendStatus = `+${trendDeltaPct}% Upward Drift`;
        trendSeverity = "warning";
        trendDescription = `Spending across completed ${periodTypeLabel} is pacing higher than earlier baselines (+${trendDeltaPct}%). Review discretionary categories to prevent recurring lifestyle creep.`;
      } else if (trendDeltaPct < -5) {
        trendStatus = `${trendDeltaPct}% Disciplined Contraction`;
        trendSeverity = "good";
        trendDescription = `Spending contracted by ${Math.abs(trendDeltaPct)}% across recent completed ${periodTypeLabel}, preserving more capital towards savings goals.`;
      } else {
        trendStatus = `Steady Pace (${trendDeltaPct >= 0 ? "+" : ""}${trendDeltaPct}%)`;
        trendSeverity = "neutral";
        trendDescription = `Spending velocity across completed ${periodTypeLabel} remains balanced, staying within ±6% of your historical median expenditure.`;
      }
    } else if (completedPeriods.length === 1) {
      trendDescription = `Tracking 1 completed ${dimension === "cycle" ? "pay cycle" : "month"}. Baseline comparisons will calibrate further with each completed period.`;
    } else {
      trendDescription = `Current ${dimension === "cycle" ? "pay cycle" : "month"} is active. Multi-period historical drift metrics will compute upon period completion.`;
    }

    const catTotals = new Map<string, number>();
    const catAmountsPerPeriod = new Map<string, number[]>();

    for (const p of basePeriods) {
      const pCatMap = new Map<string, number>();
      for (const seg of p.segments) {
        catTotals.set(seg.category, (catTotals.get(seg.category) || 0) + seg.amount);
        pCatMap.set(seg.category, seg.amount);
      }
      for (const [cName] of catTotals) {
        const arr = catAmountsPerPeriod.get(cName) || [];
        arr.push(pCatMap.get(cName) || 0);
        catAmountsPerPeriod.set(cName, arr);
      }
    }

    let dominantCategory: { name: string; amount: number; pct: number } | null = null;
    if (catTotals.size > 0) {
      const sorted = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]);
      const topName = sorted[0][0];
      const topAmt = Math.round(sorted[0][1] / basePeriods.length);
      const pct = totalSpendSum > 0 ? Math.round((sorted[0][1] / totalSpendSum) * 100) : 0;
      dominantCategory = { name: topName, amount: topAmt, pct };
    }

    const sortedBySpend = [...basePeriods].sort((a, b) => b.totalSpend - a.totalSpend);
    const peakPeriod = sortedBySpend[0];
    const lowestPeriod = sortedBySpend[sortedBySpend.length - 1];

    const recurringProfiles: RecurringCategoryProfile[] = [];
    const allKnownCategories = Array.from(catTotals.keys());

    const findCategoryName = (pattern: RegExp): string | null => {
      return allKnownCategories.find((c) => pattern.test(c)) || null;
    };

    const housingCatName = findCategoryName(/housing|rent|mortgage/i);
    const transportCatName = findCategoryName(/transport|travel|fuel|commute|cab/i);
    const utilitiesCatName = findCategoryName(/utilit|bill|subscription|wifi|internet|phone/i);
    const foodCatName = findCategoryName(/food|grocer|dining|supermarket/i);

    const buildProfile = (
      catName: string,
      type: string,
      iconType: "home" | "car" | "utensils" | "receipt"
    ): RecurringCategoryProfile => {
      const amounts = catAmountsPerPeriod.get(catName) || [];
      const nonZero = amounts.filter((a) => a > 0);
      const total = amounts.reduce((sum, a) => sum + a, 0);
      const avgAmount = Math.round(total / basePeriods.length);
      const sharePct = avgSpend > 0 ? Math.round((avgAmount / avgSpend) * 100) : 0;
      const frequencyPct = Math.round((nonZero.length / basePeriods.length) * 100);

      let variancePct = 0;
      if (nonZero.length >= 2) {
        const max = Math.max(...nonZero);
        const min = Math.min(...nonZero);
        variancePct = avgAmount > 0 ? Math.round(((max - min) / avgAmount) * 100) : 0;
      }

      let driftPct = 0;
      let driftLabel = "Stable";
      if (amounts.length >= 2) {
        const mid = Math.floor(amounts.length / 2);
        const earlierAvg = amounts.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const recentAvg = amounts.slice(mid).reduce((a, b) => a + b, 0) / (amounts.length - mid);
        if (earlierAvg > 0) {
          driftPct = Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100);
        }
        if (driftPct > 8) driftLabel = `+${driftPct}% Drift`;
        else if (driftPct < -8) driftLabel = `${driftPct}% Decline`;
        else driftLabel = "Stable";
      }

      return {
        name: catName,
        type,
        avgAmount,
        sharePct,
        frequencyPct,
        variancePct,
        driftPct,
        driftLabel,
        iconType,
      };
    };

    if (housingCatName) {
      recurringProfiles.push(buildProfile(housingCatName, "Fixed Shelter Obligation", "home"));
    }
    if (transportCatName) {
      recurringProfiles.push(buildProfile(transportCatName, "Recurring Commute Baseline", "car"));
    }
    if (utilitiesCatName) {
      recurringProfiles.push(buildProfile(utilitiesCatName, "Fixed Bills & Overhead", "receipt"));
    }
    if (foodCatName) {
      recurringProfiles.push(buildProfile(foodCatName, "Essential Food Baseline", "utensils"));
    }

    const fixedObligationCategories = [housingCatName, utilitiesCatName].filter(Boolean) as string[];
    let fixedTotalAvg = 0;
    for (const fCat of fixedObligationCategories) {
      const total = (catAmountsPerPeriod.get(fCat) || []).reduce((a, b) => a + b, 0);
      fixedTotalAvg += Math.round(total / basePeriods.length);
    }
    if (transportCatName) {
      const transTotal = (catAmountsPerPeriod.get(transportCatName) || []).reduce((a, b) => a + b, 0);
      fixedTotalAvg += Math.round((transTotal / basePeriods.length) * 0.7);
    }

    const fixedSharePct = avgSpend > 0 ? Math.min(100, Math.round((fixedTotalAvg / avgSpend) * 100)) : 0;
    const discretionaryTotalAvg = Math.max(0, avgSpend - fixedTotalAvg);
    const discretionarySharePct = Math.max(0, 100 - fixedSharePct);

    const recommendations: string[] = [];

    if (inProgressPeriod) {
      const inProgSpend = inProgressPeriod.totalSpend;
      const inProgPct = avgSpend > 0 ? Math.round((inProgSpend / avgSpend) * 100) : 0;
      recommendations.push(
        `Active Cycle Tracking: Current ${dimension === "cycle" ? "cycle" : "month"} has logged ${currency}${Math.round(inProgSpend).toLocaleString("en-IN")} so far (${inProgPct}% of historical completed average ${currency}${avgSpend.toLocaleString("en-IN")}). It is actively separated from completed baseline benchmarks.`
      );
    }

    if (housingCatName) {
      const hProfile = recurringProfiles.find((r) => r.name === housingCatName);
      if (hProfile && hProfile.sharePct > 35) {
        recommendations.push(
          `Shelter Baseline: ${hProfile.name} locks in ${currency}${hProfile.avgAmount.toLocaleString("en-IN")} per period (${hProfile.sharePct}% of completed spend). Since fixed shelter is non-discretionary, savings gains must come from variable categories.`
        );
      }
    }

    if (transportCatName) {
      const tProfile = recurringProfiles.find((r) => r.name === transportCatName);
      if (tProfile) {
        if (Math.abs(tProfile.driftPct) > 10) {
          recommendations.push(
            `Transport Drift: ${tProfile.name} expenditure shifted by ${tProfile.driftPct > 0 ? "+" : ""}${tProfile.driftPct}% across completed periods (averaging ${currency}${tProfile.avgAmount.toLocaleString("en-IN")}). Setting a strict weekly fuel or cab ceiling can curb recurring transit creep.`
          );
        } else {
          recommendations.push(
            `Transport Consistency: ${tProfile.name} remains predictable at ${currency}${tProfile.avgAmount.toLocaleString("en-IN")} per period (${tProfile.sharePct}% share). Transit variance is under control.`
          );
        }
      }
    }

    if (fixedSharePct > 0) {
      if (fixedSharePct > 55) {
        recommendations.push(
          `Fixed Commitments Ratio: ${fixedSharePct}% of your completed spend is committed to non-negotiable overhead (Rent, Utilities, regular Transit). Keeping fixed overhead below 50% expands your financial safety margin.`
        );
      } else {
        recommendations.push(
          `Healthy Discretionary Buffer: ${discretionarySharePct}% of your outlay remains flexible (${currency}${discretionaryTotalAvg.toLocaleString("en-IN")} per period), providing strong defense against unexpected emergencies.`
        );
      }
    }

    if (peakPeriod && lowestPeriod && peakPeriod.id !== lowestPeriod.id && basePeriods.length >= 2) {
      const spread = peakPeriod.totalSpend - lowestPeriod.totalSpend;
      recommendations.push(
        `Variance Smoothing: Completed outlay ranged from ${currency}${Math.round(lowestPeriod.totalSpend).toLocaleString("en-IN")} (${lowestPeriod.label}) to ${currency}${Math.round(peakPeriod.totalSpend).toLocaleString("en-IN")} (${peakPeriod.label}), a spread of ${currency}${Math.round(spread).toLocaleString("en-IN")}. Establishing recurring sinking funds helps flatten peak outlays.`
      );
    }

    return {
      hasData: true,
      inProgressPeriod,
      completedPeriodsCount: completedPeriods.length,
      avgSpend,
      avgBudget,
      avgAdherence,
      trendDeltaPct,
      trendStatus,
      trendSeverity,
      trendDescription,
      dominantCategory,
      peakPeriod,
      lowestPeriod,
      recurringProfiles,
      fixedTotalAvg,
      fixedSharePct,
      discretionaryTotalAvg,
      discretionarySharePct,
      recommendations,
    };
  }, [periods, dimension, currency]);

  const severityBadgeClass = (sev: "good" | "neutral" | "warning") => {
    if (sev === "good") return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (sev === "warning") return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  const renderBullet = (str: string) => {
    const colonIdx = str.indexOf(":");
    if (colonIdx > 0 && colonIdx < 35) {
      const title = str.slice(0, colonIdx);
      const body = str.slice(colonIdx + 1);
      return (
        <span>
          <strong className="font-semibold text-text-primary">{title}:</strong>
          {body}
        </span>
      );
    }
    return <span>{str}</span>;
  };

  const getProfileIcon = (iconType: "home" | "car" | "utensils" | "receipt") => {
    switch (iconType) {
      case "home":
        return <Home size={15} className="text-amber-600 dark:text-amber-400" />;
      case "car":
        return <Car size={15} className="text-emerald-600 dark:text-emerald-400" />;
      case "receipt":
        return <Receipt size={15} className="text-blue-600 dark:text-blue-400" />;
      case "utensils":
      default:
        return <Utensils size={15} className="text-orange-600 dark:text-orange-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-secondary text-text-primary">
            <Sparkles size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold tracking-tight text-text-primary">
                AI Historical Spend Intelligence
              </h3>
              {!isProUser && (
                <span className="rounded border border-border-subtle bg-bg-secondary px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-text-muted">
                  AI Preview
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Recurring obligations, category drift, and long-term savings optimization
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto font-mono text-[10px] font-semibold text-text-secondary bg-bg-secondary px-3 py-1 rounded-full border border-border-subtle/60 shadow-2xs">
          Gemini 2.5 Flash · Private
        </span>
      </div>

      {!isProUser && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border-subtle bg-bg-primary/40 p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="shrink-0 text-text-secondary" />
            <span className="text-text-secondary leading-relaxed">
              Showing simulated AI historical insights. Continuum Pro analyzes your real logged expenses privately.
            </span>
          </div>
          {onClaimPro && (
            <button
              type="button"
              onClick={onClaimPro}
              className="cursor-pointer rounded-full border border-text-primary bg-text-primary px-4 py-1 text-xs font-semibold text-bg-primary hover:opacity-90 transition-all shrink-0 self-start sm:self-auto shadow-xs"
            >
              Unlock Pro Insights →
            </button>
          )}
        </div>
      )}

      {stats.inProgressPeriod && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle/80 bg-bg-secondary/40 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={15} className="shrink-0 text-text-muted" />
            <span className="truncate text-text-secondary text-[11.5px]">
              <strong className="font-semibold text-text-primary">Active Cycle in Progress ({stats.inProgressPeriod.fullLabel}):</strong>{" "}
              {currency}
              {Math.round(stats.inProgressPeriod.totalSpend).toLocaleString("en-IN")} logged so far. Historical baseline strictly reflects completed periods to prevent premature distortion.
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-border-subtle bg-bg-primary px-2.5 py-0.5 font-mono text-[9.5px] font-semibold text-text-secondary">
            In Progress
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div className="flex flex-col justify-between rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-text-muted uppercase">
            Trajectory Status
          </span>
          <div className="my-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${severityBadgeClass(
                stats.trendSeverity
              )}`}
            >
              {stats.trendSeverity === "good" ? (
                <TrendingDown size={12} strokeWidth={2.5} />
              ) : stats.trendSeverity === "warning" ? (
                <TrendingUp size={12} strokeWidth={2.5} />
              ) : (
                <Minus size={12} strokeWidth={2.5} />
              )}
              {stats.trendStatus}
            </span>
          </div>
          <span className="text-[11px] text-text-secondary leading-tight">
            Completed {dimension === "cycle" ? "pay-cycle" : "monthly"} pace across {stats.completedPeriodsCount || 1} period{stats.completedPeriodsCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-text-muted uppercase">
            Historical Average Spend
          </span>
          <div className="my-1 font-serif text-2xl font-bold tracking-tight text-text-primary">
            {currency}
            {stats.avgSpend.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-text-secondary leading-tight">
            {stats.avgAdherence}% average adherence of {currency}
            {stats.avgBudget.toLocaleString("en-IN")} budget
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
          <span className="font-mono text-[10px] font-semibold tracking-wider text-text-muted uppercase">
            Dominant Category Baseline
          </span>
          <div className="my-1 text-base font-bold text-text-primary truncate">
            {stats.dominantCategory ? stats.dominantCategory.name : "—"}
            {stats.dominantCategory && (
              <span className="ml-1.5 font-mono text-xs font-semibold text-text-muted">
                ({stats.dominantCategory.pct}%)
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-secondary leading-tight">
            {stats.dominantCategory
              ? `Averaging ${currency}${stats.dominantCategory.amount.toLocaleString("en-IN")} per completed period`
              : "No category data available"}
          </span>
        </div>
      </div>

      {stats.fixedTotalAvg > 0 && (
        <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary">
              Fixed Obligations vs. Discretionary Flexibility
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-text-muted">
              {stats.fixedSharePct}% Committed · {stats.discretionarySharePct}% Flexible
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-bg-secondary flex">
            <div
              className="h-full bg-text-primary transition-all duration-500"
              style={{ width: `${stats.fixedSharePct}%` }}
              title={`Fixed Commitments: ${stats.fixedSharePct}%`}
            />
            <div
              className="h-full bg-border-hover transition-all duration-500"
              style={{ width: `${stats.discretionarySharePct}%` }}
              title={`Discretionary Buffer: ${stats.discretionarySharePct}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-text-primary inline-block" />
                Fixed Recurring Outlay
              </span>
              <span className="font-mono font-semibold text-text-primary text-sm">
                {currency}{stats.fixedTotalAvg.toLocaleString("en-IN")}{" "}
                <span className="text-[10.5px] font-normal text-text-secondary">/ period</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-border-hover inline-block" />
                Discretionary Buffer
              </span>
              <span className="font-mono font-semibold text-text-primary text-sm">
                {currency}{stats.discretionaryTotalAvg.toLocaleString("en-IN")}{" "}
                <span className="text-[10.5px] font-normal text-text-secondary">/ period</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {stats.recurringProfiles.length > 0 && (
        <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary">
              Recurring Category Intelligence (Rent, Transport, Essentials)
            </span>
            <span className="font-mono text-[9.5px] font-semibold text-text-muted">
              Completed Baselines
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {stats.recurringProfiles.map((p) => (
              <div
                key={p.name}
                className="flex flex-col justify-between rounded-lg border border-border-subtle/60 bg-bg-card/70 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getProfileIcon(p.iconType)}
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {p.name}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] font-bold text-text-muted">
                    {p.sharePct}%
                  </span>
                </div>

                <div className="my-1">
                  <div className="font-mono text-sm font-bold text-text-primary">
                    {currency}{p.avgAmount.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-text-muted block">
                    avg / completed {dimension === "cycle" ? "cycle" : "mo"}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-border-subtle/50 flex items-center justify-between text-[9.5px] font-mono">
                  <span className="text-text-muted">
                    {p.frequencyPct === 100 ? "100% Present" : `${p.frequencyPct}% freq`}
                  </span>
                  <span
                    className={`font-semibold ${
                      p.driftLabel.includes("+")
                        ? "text-amber-600 dark:text-amber-400"
                        : p.driftLabel.includes("-")
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-text-secondary"
                    }`}
                  >
                    {p.driftLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4 space-y-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary block">
          AI Trajectory Diagnosis
        </span>
        <p className="text-xs leading-relaxed text-text-secondary">
          {stats.trendDescription}
        </p>
        {stats.peakPeriod && stats.lowestPeriod && stats.completedPeriodsCount >= 2 && (
          <p className="text-xs leading-relaxed text-text-muted border-t border-border-subtle/50 pt-2 mt-2">
            Peak outlay occurred in completed period <strong className="text-text-primary font-medium">{stats.peakPeriod.fullLabel}</strong> ({currency}{Math.round(stats.peakPeriod.totalSpend).toLocaleString("en-IN")}), while lowest completed spending was achieved in <strong className="text-text-primary font-medium">{stats.lowestPeriod.fullLabel}</strong> ({currency}{Math.round(stats.lowestPeriod.totalSpend).toLocaleString("en-IN")}).
          </p>
        )}
      </div>

      {stats.recommendations.length > 0 && (
        <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary flex items-center gap-1.5 mb-2.5">
            <Lightbulb size={13} className="text-text-primary" /> STRATEGIC MULTI-PERIOD RECOMMENDATIONS
          </span>
          <ul className="space-y-2 text-xs text-text-secondary">
            {stats.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-[10px] font-semibold text-text-muted shrink-0 mt-0.5">
                  0{idx + 1}.
                </span>
                <div className="leading-relaxed text-[12px]">{renderBullet(rec)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
