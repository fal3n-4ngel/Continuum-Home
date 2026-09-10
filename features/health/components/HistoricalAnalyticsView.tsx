"use client";

import React, { useState, useMemo } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { resolvePayCycle, toLocalDateStr } from "@/lib/utils/dates";
import { CategorySegmentedBar, CategorySegment } from "./CategorySegmentedBar";
import { PeriodEvolutionChart, PeriodEvolutionData } from "./PeriodEvolutionChart";
import { HistoricalAiSummary } from "./HistoricalAiSummary";

export interface ExpenseItem {
  id: string;
  amount: number;
  category: string;
  date?: string;
  title: string;
}

interface HistoricalAnalyticsViewProps {
  expenses: ExpenseItem[];
  salaryDay: number;
  salaryLog: Record<string, { date: string; amount: number }>;
  currency: string;
  monthlySalary: number;
  additionalIncome: number;
  isProUser: boolean;
  onClaimPro: () => void;
  onBackToOverview?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#1A1A1A",
  Dining: "#1A1A1A",
  Housing: "#C5BFA0",
  Rent: "#C5BFA0",
  Transport: "#556B2F",
  Travel: "#556B2F",
  Shopping: "#E58C4A",
  Leisure: "#C9D438",
  Entertainment: "#8B5CF6",
  Utilities: "#6A7B82",
  Groceries: "#A0C4E2",
  Health: "#10B981",
  Other: "#9E9C94",
};

const PALETTE = [
  "#1A1A1A",
  "#C5BFA0",
  "#556B2F",
  "#E58C4A",
  "#C9D438",
  "#6A7B82",
  "#8B5CF6",
  "#10B981",
  "#3B82F6",
  "#B35C44",
];

function getColorForCategory(cat: string, index: number): string {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  return PALETTE[index % PALETTE.length];
}

const SAMPLE_PERIODS: PeriodEvolutionData[] = [
  {
    id: "sample-1",
    label: "JAN",
    fullLabel: "January 2024",
    totalSpend: 42100,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 16840, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10525, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6315, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4210, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 4210, percentage: 10, color: "#C9D438" },
    ],
  },
  {
    id: "sample-2",
    label: "FEB",
    fullLabel: "February 2024",
    totalSpend: 39500,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 15800, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 9875, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 7900, percentage: 20, color: "#556B2F" },
      { category: "Shopping", amount: 3950, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 1975, percentage: 5, color: "#C9D438" },
    ],
  },
  {
    id: "sample-3",
    label: "MAR",
    fullLabel: "March 2024",
    totalSpend: 44200,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 17680, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 11050, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6630, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 5304, percentage: 12, color: "#E58C4A" },
      { category: "Leisure", amount: 3536, percentage: 8, color: "#C9D438" },
    ],
  },
  {
    id: "sample-4",
    label: "APR",
    fullLabel: "April 2024",
    totalSpend: 41800,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 16720, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10450, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 8360, percentage: 20, color: "#556B2F" },
      { category: "Shopping", amount: 4180, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 2090, percentage: 5, color: "#C9D438" },
    ],
  },
  {
    id: "sample-5",
    label: "MAY",
    fullLabel: "May 2024",
    totalSpend: 43000,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 17200, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10750, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6450, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4300, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 4300, percentage: 10, color: "#C9D438" },
    ],
  },
  {
    id: "sample-6",
    label: "JUN",
    fullLabel: "June 2024",
    totalSpend: 45600,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 18240, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 11400, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6840, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4560, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 4560, percentage: 10, color: "#C9D438" },
    ],
  },
  {
    id: "sample-7",
    label: "JUL",
    fullLabel: "July 2024",
    totalSpend: 42800,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 17120, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10700, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 8560, percentage: 20, color: "#556B2F" },
      { category: "Shopping", amount: 4280, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 2140, percentage: 5, color: "#C9D438" },
    ],
  },
  {
    id: "sample-8",
    label: "AUG",
    fullLabel: "August 2024",
    totalSpend: 41200,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 16480, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10300, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6180, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4944, percentage: 12, color: "#E58C4A" },
      { category: "Leisure", amount: 3296, percentage: 8, color: "#C9D438" },
    ],
  },
  {
    id: "sample-9",
    label: "SEP",
    fullLabel: "September 2024",
    totalSpend: 43500,
    incomeOrBudget: 55000,
    isCurrent: true,
    segments: [
      { category: "Housing", amount: 17400, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10875, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6525, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4350, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 4350, percentage: 10, color: "#C9D438" },
    ],
  },
  {
    id: "sample-10",
    label: "OCT",
    fullLabel: "October 2024",
    totalSpend: 42000,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 16800, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 10500, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6300, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 5040, percentage: 12, color: "#E58C4A" },
      { category: "Leisure", amount: 3360, percentage: 8, color: "#C9D438" },
    ],
  },
  {
    id: "sample-11",
    label: "NOV",
    fullLabel: "November 2024",
    totalSpend: 44800,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 17920, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 11200, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6720, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 4480, percentage: 10, color: "#E58C4A" },
      { category: "Leisure", amount: 4480, percentage: 10, color: "#C9D438" },
    ],
  },
  {
    id: "sample-12",
    label: "DEC",
    fullLabel: "December 2024",
    totalSpend: 46200,
    incomeOrBudget: 55000,
    segments: [
      { category: "Housing", amount: 18480, percentage: 40, color: "#1A1A1A" },
      { category: "Food", amount: 11550, percentage: 25, color: "#C5BFA0" },
      { category: "Transport", amount: 6930, percentage: 15, color: "#556B2F" },
      { category: "Shopping", amount: 5544, percentage: 12, color: "#E58C4A" },
      { category: "Leisure", amount: 3696, percentage: 8, color: "#C9D438" },
    ],
  },
];

export const HistoricalAnalyticsView: React.FC<HistoricalAnalyticsViewProps> = ({
  expenses,
  salaryDay,
  salaryLog,
  currency,
  monthlySalary,
  additionalIncome,
  isProUser,
  onClaimPro,
  onBackToOverview,
}) => {
  const [dimension, setDimension] = useState<"cycle" | "month">("cycle");
  const [chartMode, setChartMode] = useState<"percentage" | "amount">("percentage");
  const [selectedId, setSelectedId] = useState<string>("");

  const totalBaselineIncome = (monthlySalary || 0) + (additionalIncome || 0);

  const realPeriods = useMemo(() => {
    if (!expenses) return [];

    if (dimension === "cycle") {
      const results: PeriodEvolutionData[] = [];
      let refDate = new Date();

      for (let i = 0; i < 12; i++) {
        const c = resolvePayCycle(salaryDay, salaryLog, refDate);
        const cycleExpenses = expenses.filter(
          (e) => e.date && e.date >= c.startStr && e.date <= c.endStr
        );
        const totalSpend = cycleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const catMap = new Map<string, number>();
        for (const e of cycleExpenses) {
          const cat = e.category || "Uncategorized";
          catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
        }

        const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
        const segments: CategorySegment[] = sortedCats.map(([cat, amt], idx) => ({
          category: cat,
          amount: amt,
          percentage: totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0,
          color: getColorForCategory(cat, idx),
        }));

        const sDate = new Date(`${c.startStr}T00:00:00`);
        const eDate = new Date(`${c.endStr}T00:00:00`);
        const label = `${sDate.getDate()} ${sDate.toLocaleString("en-US", { month: "short" })}`;
        const fullLabel = `${sDate.getDate()} ${sDate.toLocaleString("en-US", { month: "short" })} – ${eDate.getDate()} ${eDate.toLocaleString("en-US", { month: "short", year: "numeric" })}`;
        const incomeOrBudget = salaryLog[c.startStr]?.amount || totalBaselineIncome;

        results.push({
          id: c.startStr,
          label,
          fullLabel,
          totalSpend,
          incomeOrBudget,
          isCurrent: i === 0,
          segments,
        });

        refDate = new Date(`${c.prevEndStr}T00:00:00`);
      }

      return results.reverse();
    }

    const results: PeriodEvolutionData[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = new Set<number>([currentYear]);

    for (const e of expenses) {
      if (e.date && e.date.length >= 4) {
        const y = parseInt(e.date.slice(0, 4), 10);
        if (!isNaN(y) && y >= 2000 && y <= currentYear + 1) {
          years.add(y);
        }
      }
    }

    const sortedYears = Array.from(years).sort((a, b) => a - b);

    for (const yyyy of sortedYears) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(yyyy, m, 1);
        const mm = String(m + 1).padStart(2, "0");
        const prefix = `${yyyy}-${mm}`;

        const monthExpenses = expenses.filter((e) => e.date && e.date.startsWith(prefix));
        const totalSpend = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const catMap = new Map<string, number>();
        for (const e of monthExpenses) {
          const cat = e.category || "Uncategorized";
          catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
        }

        const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
        const segments: CategorySegment[] = sortedCats.map(([cat, amt], idx) => ({
          category: cat,
          amount: amt,
          percentage: totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0,
          color: getColorForCategory(cat, idx),
        }));

        const label = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
        const fullLabel = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        const isCurrent = yyyy === now.getFullYear() && m === now.getMonth();

        results.push({
          id: prefix,
          label,
          fullLabel,
          totalSpend,
          incomeOrBudget: totalBaselineIncome,
          isCurrent,
          segments,
        });
      }
    }

    return results;
  }, [expenses, dimension, salaryDay, salaryLog, totalBaselineIncome]);

  const activePeriods = isProUser ? realPeriods : SAMPLE_PERIODS;

  const currentSelection = useMemo(() => {
    if (!activePeriods || activePeriods.length === 0) return null;
    if (selectedId) {
      const found = activePeriods.find((p) => p.id === selectedId);
      if (found) return found;
    }
    const current = activePeriods.find((p) => p.isCurrent);
    if (current) return current;
    return activePeriods[activePeriods.length - 1];
  }, [activePeriods, selectedId]);

  const chartPeriods = useMemo(() => {
    if (dimension !== "month" || activePeriods.length <= 12) {
      return activePeriods;
    }
    if (currentSelection) {
      const selectedYear = currentSelection.id.slice(0, 4);
      const yearPeriods = activePeriods.filter((p) => p.id.startsWith(selectedYear));
      if (yearPeriods.length > 0) return yearPeriods;
    }
    return activePeriods.slice(-12);
  }, [activePeriods, dimension, currentSelection]);

  const adherencePct = useMemo(() => {
    if (!currentSelection || currentSelection.incomeOrBudget <= 0) return 0;
    return Math.min(100, Math.round((currentSelection.totalSpend / currentSelection.incomeOrBudget) * 100));
  }, [currentSelection]);

  const savedAmount = useMemo(() => {
    if (!currentSelection || currentSelection.incomeOrBudget <= 0) return 0;
    return Math.max(0, currentSelection.incomeOrBudget - currentSelection.totalSpend);
  }, [currentSelection]);

  return (
    <div className="flex flex-col gap-6 w-full animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="flex h-8 w-8 min-w-[32px] min-h-[32px] aspect-square p-0 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-primary hover:border-border-hover transition-all shadow-2xs cursor-pointer"
              title="Back to Overview"
              aria-label="Back to Overview"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.2} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-text-primary">
                Historical Analytics
              </h2>
              {!isProUser && (
                <span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-text-muted uppercase">
                  Sample Preview
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Historical pay cycle and monthly spend distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary p-1 shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setDimension("cycle")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              dimension === "cycle"
                ? "bg-text-primary text-bg-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Pay Cycle
          </button>
          <button
            onClick={() => setDimension("month")}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              dimension === "month"
                ? "bg-text-primary text-bg-primary shadow-xs"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {!isProUser && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-dashed border-border-subtle bg-bg-card/70 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-text-primary">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Historical Analytics is a Continuum Pro feature
              </p>
              <p className="text-[11px] text-text-secondary leading-tight">
                Showing simulated sample data. Upgrade to unlock multi-cycle spend distribution and historical budget tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClaimPro}
            className="rounded-full border border-text-primary bg-text-primary px-4 py-1.5 text-xs font-semibold text-bg-primary hover:opacity-90 transition-all shrink-0 self-start sm:self-auto shadow-xs"
          >
            Claim Pro Upgrade
          </button>
        </div>
      )}

      {currentSelection && (
        <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle/60 pb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-text-primary">
                {currentSelection.fullLabel}
              </h2>
              {currentSelection.isCurrent && (
                <span className="rounded bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-text-secondary">
                  Current
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={currentSelection.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className="cursor-pointer appearance-none rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 pr-8 font-mono text-xs font-semibold text-text-primary outline-none hover:border-border-hover transition-all"
              >
                {activePeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullLabel}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                ▼
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Cycle Settled · Budget Adherence
              </span>
              <p className="mt-1 text-sm font-medium text-text-secondary">
                <span className="font-semibold text-text-primary">
                  {currency}{Math.round(currentSelection.totalSpend).toLocaleString("en-IN")}
                </span>{" "}
                of {currency}{Math.round(currentSelection.incomeOrBudget).toLocaleString("en-IN")} target
              </p>
            </div>

            <div className="text-right">
              <span className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-text-primary">
                {adherencePct}%
              </span>
            </div>
          </div>

          <CategorySegmentedBar
            segments={currentSelection.segments}
            currency={currency}
            height={20}
          />

          <div className="grid grid-cols-3 gap-2 border-t border-border-subtle/60 pt-4 text-xs max-sm:grid-cols-1">
            <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle/50 bg-bg-primary/40 p-2.5">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-text-muted">Total Spent</span>
              <span className="font-mono text-sm font-semibold text-text-primary">
                {currency}{Math.round(currentSelection.totalSpend).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle/50 bg-bg-primary/40 p-2.5">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-text-muted">Preserved Savings</span>
              <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                +{currency}{Math.round(savedAmount).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle/50 bg-bg-primary/40 p-2.5">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-text-muted">Total Baseline</span>
              <span className="font-mono text-sm font-semibold text-text-primary">
                {currency}{Math.round(currentSelection.incomeOrBudget).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}

      <HistoricalAiSummary
        periods={activePeriods}
        expenses={expenses}
        dimension={dimension}
        currency={currency}
        isProUser={isProUser}
        onClaimPro={onClaimPro}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold tracking-tight text-text-primary">
              Spend Evolution
            </h3>
            <p className="text-[11.5px] text-text-secondary">
              Category proportions across consecutive {dimension === "cycle" ? "pay cycles" : "months"}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary p-0.5">
            <button
              onClick={() => setChartMode("percentage")}
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase transition-all ${
                chartMode === "percentage"
                  ? "bg-text-primary text-bg-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Percentage (%)
            </button>
            <button
              onClick={() => setChartMode("amount")}
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase transition-all ${
                chartMode === "amount"
                  ? "bg-text-primary text-bg-primary shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Amount ({currency})
            </button>
          </div>
        </div>

        <PeriodEvolutionChart
          periods={chartPeriods}
          mode={chartMode}
          currency={currency}
          selectedPeriodId={currentSelection?.id}
          onSelectPeriod={(id) => setSelectedId(id)}
        />
      </div>

      {currentSelection && currentSelection.segments.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
            <h3 className="font-serif text-base font-bold tracking-tight text-text-primary">
              Category Breakdown · {currentSelection.fullLabel}
            </h3>
            <span className="font-mono text-xs text-text-muted">
              {currentSelection.segments.length} categories
            </span>
          </div>

          <div className="divide-y divide-border-subtle/40">
            {currentSelection.segments.map((seg) => (
              <div key={seg.category} className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-semibold text-text-primary">{seg.category}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 hidden sm:block h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-text-primary text-right min-w-[70px]">
                    {currency}{Math.round(seg.amount).toLocaleString("en-IN")}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted text-right min-w-[35px]">
                    {seg.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
