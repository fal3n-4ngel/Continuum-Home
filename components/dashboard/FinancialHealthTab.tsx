import React, { useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  ScanSearch,
  IndianRupee,
  Shield,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  Wallet,
  PiggyBank,
  Coins,
  Clock,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Settings2,
  RotateCw,
  Lightbulb,
  HeartPulse,
} from "lucide-react";
import { InvestmentAsset } from "@/types";
import { getEffectiveAmount } from "@/lib/finance";
import { HealthAnalyticsReport } from "@/lib/firebase";
import { toLocalDateStr } from "@/lib/utils/dates";

interface PayCycle {
  startStr: string;
  endStr: string;
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  spentSoFar: number;
  subMonthlyCost: number;
  projectedTotalSpend: number;
  committedSpend: number;
  projectedRemaining: number;
  paceConfidence: number;
  totalIncome: number;
  isSalaryLogged: boolean;
  expectedCashOnHand: number;
  expectedSavings: number;
  savingsRate: number;
  prevCycleSpend: number;
  prevCycleSpendToSameDay: number;
  paceDeltaPct: number | null;
  cycleCatBreakdown: Record<string, number>;
}

interface CycleHistoryEntry {
  startStr: string;
  endStr: string;
  income: number;
  spend: number;
  savings: number;
  isSalaryLogged: boolean;
  hasData: boolean;
}

interface CycleAverages {
  avgIncome: number;
  avgSpend: number;
  avgSavings: number;
  avgSavingsRate: number;
  cycleCount: number;
}

interface FinancialHealthTabProps {
  currency: string;
  expenses?: Array<{ amount: number | null; date: string | null }>;
  investments: InvestmentAsset[];
  showInvestmentsTab: boolean;
  salaryDay: number;
  monthlySalary: number;
  setMonthlySalary: (val: number) => void;
  additionalIncome: number;
  setAdditionalIncome: (val: number) => void;
  payCycle: PayCycle;
  savedReconciliation?: number;
  setReconciliation: (cycleStartDate: string, actualAmount: number | null) => void;
  salaryLog: Record<string, { date: string; amount: number }>;
  setSalaryLogEntry: (date: string, amount: number) => void;
  cycleHistory: CycleHistoryEntry[];
  cycleAverages: CycleAverages | null;
  reconciliations: Record<string, number>;
  logUnaccountedGap: (amount: number) => void;
  getHeaders?: () => Record<string, string>;
  isProUser?: boolean;
  onClaimPro?: () => void;
}

const STAT_CARD =
  "flex flex-col justify-between gap-2 rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle relative overflow-hidden transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[24px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "text-[11px] text-text-muted";
const BENTO_CARD = "rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-subtle flex flex-col justify-between";
const BTN_PRIMARY =
  "cursor-pointer rounded-full border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-bg-primary shadow-xs transition-all duration-200 hover:opacity-90 disabled:opacity-60";
const BTN_SECONDARY =
  "cursor-pointer rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-xs font-semibold text-text-primary shadow-2xs transition-all duration-200 hover:bg-bg-primary hover:border-border-hover";

const fmtDate = (s: string) => {
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const HealthSeal = ({ className = "h-8 w-8" }: { className?: string }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-primary select-none shadow-2xs ${className}`}
    aria-label="Financial Health"
  >
    <HeartPulse size={14} />
  </div>
);

const LIQUIDITY_WEIGHTS: Record<string, number> = {
  cash: 1.0,
  gold: 0.95,
  mutual_fund: 0.9,
  sip: 0.9,
  fixed_deposit: 0.75,
  other: 0.85,
  equity: 0.8,
  crypto: 0.65,
};
const DEFAULT_LIQUIDITY_WEIGHT = 0.85;

interface GeminiHealthAnalyticsProps {
  currency: string;
  payCycle: PayCycle;
  targetSavingsGoal: number;
  portfolioValue: number;
  getHeaders?: () => Record<string, string>;
}

const GeminiHealthAnalytics: React.FC<GeminiHealthAnalyticsProps> = ({
  currency,
  payCycle,
  targetSavingsGoal,
  portfolioValue,
  getHeaders,
}) => {
  const [report, setReport] = useState<HealthAnalyticsReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const payload = {
        startStr: payCycle.startStr,
        spentSoFar: payCycle.spentSoFar,
        projectedTotalSpend: payCycle.projectedTotalSpend,
        prevCycleSpend: payCycle.prevCycleSpend,
        prevCycleSpendToSameDay: payCycle.prevCycleSpendToSameDay,
        paceDeltaPct: payCycle.paceDeltaPct,
        cycleCatBreakdown: payCycle.cycleCatBreakdown,
        totalIncome: payCycle.totalIncome,
        targetSavings: targetSavingsGoal,
        currency,
      };

      const search = new URLSearchParams({
        startStr: payCycle.startStr,
        spentSoFar: String(payCycle.spentSoFar),
        projectedTotalSpend: String(payCycle.projectedTotalSpend),
        prevCycleSpend: String(payCycle.prevCycleSpend),
        prevCycleSpendToSameDay: String(payCycle.prevCycleSpendToSameDay),
        totalIncome: String(payCycle.totalIncome),
        targetSavings: String(targetSavingsGoal),
        currency,
      });
      if (payCycle.paceDeltaPct != null) {
        search.set("paceDeltaPct", String(payCycle.paceDeltaPct));
      }
      if (payCycle.cycleCatBreakdown) {
        search.set("cycleCatBreakdown", JSON.stringify(payCycle.cycleCatBreakdown));
      }
      if (force) search.set("force", "true");

      const authHeaders = getHeaders ? getHeaders() : {};
      const res = await fetch(`/api/assistant/health-analytics?${search.toString()}`, {
        method: force ? "POST" : "GET",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: force ? JSON.stringify(payload) : undefined,
      });

      if (!res.ok) throw new Error("Failed to load AI analytics");

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setIsCached(!!data.cached);
      } else if (data.budgetExceeded) {
        setError("Daily Gemini request limit reached. Showing latest saved snapshot.");
      }
    } catch (err) {
      console.error("Gemini spend analytics fetch error:", err);
      setError("AI spend analytics unavailable at the moment");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(false);
  }, [
    payCycle.startStr,
    payCycle.spentSoFar,
    payCycle.projectedTotalSpend,
    payCycle.prevCycleSpend,
    targetSavingsGoal,
  ]);

  const severityColor = (severity?: string) => {
    if (severity === "good") return "text-[#2e7d32] bg-[#E6F4EA] border-[#2e7d32]/30";
    if (severity === "warning") return "text-[#b3666b] bg-[#FDF6F0] border-[#e39282]/50";
    return "text-[#c05621] bg-[#FDF6F0] border-[#fbd38d]/60";
  };

  const cleanText = (str: string): string => {
    if (!str) return "";
    return str.replace(/\*\*/g, "").replace(/#/g, "").trim();
  };

  const renderFormattedBullet = (str: string) => {
    const clean = cleanText(str);
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0 && colonIdx < 35) {
      const title = clean.slice(0, colonIdx);
      const body = clean.slice(colonIdx + 1);
      return (
        <span>
          <strong className="font-semibold text-text-primary">{title}:</strong>
          {body}
        </span>
      );
    }
    return <span>{clean}</span>;
  };

  const formattedDate = report?.updatedAt
    ? new Date(report.updatedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="rounded-card border border-border-subtle border-t-2 border-t-[#e39282]/80 bg-bg-card p-5 shadow-subtle flex flex-col gap-4 relative overflow-hidden transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-primary text-text-secondary">
            <BarChart3 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-semibold tracking-tight text-text-primary">
                Monthly Spend &amp; Trend Analytics
              </h3>
              {report && (
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border flex items-center gap-1 ${severityColor(report.trendSeverity)}`}>
                  {cleanText(report.trendStatus)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted">
              Category burn breakdown, pace trajectory, and budget optimization strategies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report?.updatedAt && (
            <span className="font-mono text-[10px] font-medium text-text-muted bg-bg-primary px-2.5 py-1 rounded-md border border-border-subtle">
              {isCached ? `Cached (${formattedDate})` : "Updated"}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            className="cursor-pointer rounded-md border border-border-subtle bg-bg-card px-3 py-1.5 text-[11.5px] font-semibold text-text-primary shadow-2xs transition-all hover:bg-bg-primary hover:border-border-hover disabled:opacity-50 flex items-center gap-1.5"
          >
            <RotateCw size={12} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Updating..." : "Refresh Analytics"}</span>
          </button>
        </div>
      </div>

      {loading && !report && (
        <div className="py-6 flex items-center justify-center gap-2 text-xs font-medium text-text-secondary">
          <RotateCw size={16} className="animate-spin text-text-muted" />
          <span>Analyzing monthly category spend patterns...</span>
        </div>
      )}

      {error && !report && (
        <div className="flex items-center gap-2 rounded-lg border border-[#fbd38d]/60 bg-[#FDF6F0] p-3 text-xs text-[#c05621]">
          <AlertTriangle size={15} className="shrink-0 text-[#c05621]" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="flex flex-col gap-4 text-xs">
          <div className="border-l-2 border-l-[#e39282]/80 pl-3.5 py-1 text-text-secondary text-[12.5px] leading-relaxed italic">
            <p className="font-medium text-text-primary">{cleanText(report.executiveSummary)}</p>
          </div>

          {report.topCategories && report.topCategories.length > 0 && (
            <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary block mb-3">
                TOP CATEGORY BURN BREAKDOWN
              </span>
              <div className="space-y-2.5">
                {report.topCategories.map((cat, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-text-primary capitalize">{cleanText(cat.category)}</span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {currency}{cat.amount.toLocaleString("en-IN")} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border-subtle/30 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, cat.percentage)}%`,
                          backgroundColor: idx === 0 ? "#e39282" : "#6B685F",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.safeSpendAdvice && (
            <div className="flex items-start gap-3 rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-3.5 text-text-primary">
              <ShieldCheck size={16} className="shrink-0 text-text-secondary mt-0.5" />
              <div className="leading-snug">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary block mb-1">
                  MONTHLY SPEND PACE GUIDANCE
                </span>
                <p className="text-xs font-medium leading-relaxed text-text-secondary">{cleanText(report.safeSpendAdvice)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            {report.spendTrends && report.spendTrends.length > 0 && (
              <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary flex items-center gap-1.5 mb-2.5">
                  <TrendingUp size={13} className="text-[#2e7d32]" /> MONTHLY SPEND TRENDS
                </span>
                <ul className="space-y-2 text-xs text-text-secondary">
                  {report.spendTrends.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2e7d32]/70 shrink-0 mt-1.5" />
                      <div className="leading-relaxed text-[12px]">{renderFormattedBullet(s)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.anomalies && report.anomalies.length > 0 && (
              <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary flex items-center gap-1.5 mb-2.5">
                  <AlertTriangle size={13} className="text-[#e39282]" /> CATEGORY ANOMALIES &amp; SPIKES
                </span>
                <ul className="space-y-2 text-xs text-text-secondary">
                  {report.anomalies.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#e39282] shrink-0 mt-1.5" />
                      <div className="leading-relaxed text-[12px]">{renderFormattedBullet(r)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {report.savingOpportunities && report.savingOpportunities.length > 0 && (
            <div className="rounded-xl border border-border-subtle/70 bg-bg-primary/30 p-4">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary flex items-center gap-1.5 mb-2.5">
                <Lightbulb size={13} className="text-text-primary" /> ACTIONABLE MONTHLY SAVINGS STRATEGY
              </span>
              <ul className="space-y-2 text-xs text-text-secondary">
                {report.savingOpportunities.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] font-semibold text-text-muted shrink-0 mt-0.5">
                      0{idx + 1}.
                    </span>
                    <div className="leading-relaxed text-[12px]">{renderFormattedBullet(rec)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FinancialHealthTab: React.FC<FinancialHealthTabProps> = ({
  currency,
  expenses = [],
  investments,
  showInvestmentsTab,
  monthlySalary,
  setMonthlySalary,
  additionalIncome,
  setAdditionalIncome,
  payCycle,
  savedReconciliation,
  setReconciliation,
  salaryLog,
  setSalaryLogEntry,
  cycleHistory,
  cycleAverages,
  reconciliations,
  logUnaccountedGap,
  getHeaders,
  isProUser = false,
  onClaimPro,
}) => {
  const [reconcileAnswer, setReconcileAnswer] = useState<"yes" | "no" | null>(null);
  const [actualAmount, setActualAmount] = useState("");
  const [isEditingReconciliation, setIsEditingReconciliation] = useState(false);
  const [gapLoggedFor, setGapLoggedFor] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"reconcile" | "income">("reconcile");
  const [showMethodology, setShowMethodology] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState<string>(monthlySalary ? String(monthlySalary) : "");
  const [additionalIncomeDraft, setAdditionalIncomeDraft] = useState<string>(additionalIncome ? String(additionalIncome) : "");

  useEffect(() => {
    setSalaryDraft(monthlySalary ? String(monthlySalary) : "");
  }, [monthlySalary]);

  useEffect(() => {
    setAdditionalIncomeDraft(additionalIncome ? String(additionalIncome) : "");
  }, [additionalIncome]);

  const loggedPayday = salaryLog[payCycle.startStr];
  const [isEditingPayday, setIsEditingPayday] = useState(false);
  const [paydayDate, setPaydayDate] = useState(payCycle.startStr);
  const [paydayAmount, setPaydayAmount] = useState(String(loggedPayday?.amount || monthlySalary || ""));

  useEffect(() => {
    setPaydayDate(payCycle.startStr);
    setPaydayAmount(String(salaryLog[payCycle.startStr]?.amount || monthlySalary || ""));
    setIsEditingPayday(false);
  }, [payCycle.startStr, salaryLog, monthlySalary]);

  const savePayday = () => {
    const parsed = parseFloat(paydayAmount);
    if (isNaN(parsed) || !paydayDate) return;
    setSalaryLogEntry(paydayDate, parsed);
    setIsEditingPayday(false);
  };

  const DISCREPANCY_THRESHOLD = Math.max(50, payCycle.totalIncome * 0.01);

  useEffect(() => {
    if (savedReconciliation !== undefined) {
      setActualAmount(String(savedReconciliation));
      setReconcileAnswer(
        Math.abs(savedReconciliation - payCycle.expectedCashOnHand) <= DISCREPANCY_THRESHOLD ? "yes" : "no"
      );
    } else {
      setActualAmount("");
      setReconcileAnswer(null);
    }
    setIsEditingReconciliation(false);
  }, [payCycle.startStr, savedReconciliation]);

  const safeInvestments = Array.isArray(investments) ? investments : [];
  const portfolioValue = safeInvestments.reduce((acc, a) => acc + getEffectiveAmount(a), 0);

  const accessibleReserve = safeInvestments.reduce(
    (acc, a) => acc + getEffectiveAmount(a) * (LIQUIDITY_WEIGHTS[a.category] ?? DEFAULT_LIQUIDITY_WEIGHT),
    0
  );

  const monthlyBurn = payCycle.totalDays > 0 ? payCycle.projectedTotalSpend * (30 / payCycle.totalDays) : 0;
  const emergencyRunwayMonths = monthlyBurn > 0 && accessibleReserve > 0 ? accessibleReserve / monthlyBurn : null;

  const catEntries = Object.entries(payCycle.cycleCatBreakdown || {});
  const maxCatAmount = catEntries.length > 0 ? catEntries[0][1] : 0;

  const parsedActual = parseFloat(actualAmount);
  const rawDiscrepancy = savedReconciliation !== undefined ? payCycle.expectedCashOnHand - savedReconciliation : null;
  const isSynced = savedReconciliation !== undefined && rawDiscrepancy !== null && Math.abs(rawDiscrepancy) <= DISCREPANCY_THRESHOLD;

  const confirmedCashLeft = isSynced || savedReconciliation === undefined
    ? payCycle.expectedCashOnHand
    : payCycle.expectedCashOnHand - (rawDiscrepancy ?? 0);

  const discrepancy = rawDiscrepancy;

  const confirmMatches = () => {
    const rounded = Math.round(payCycle.expectedCashOnHand);
    setReconciliation(payCycle.startStr, rounded);
    setActualAmount(String(rounded));
    setReconcileAnswer("yes");
    setIsEditingReconciliation(false);
  };

  const saveActualAmount = () => {
    if (isNaN(parsedActual)) return;
    setReconciliation(payCycle.startStr, parsedActual);
    setReconcileAnswer("no");
    setIsEditingReconciliation(false);
  };

  const showRecordedSummary = savedReconciliation !== undefined && !isEditingReconciliation;

  const reconciliationTrack = cycleHistory
    .filter((c) => reconciliations[c.startStr] !== undefined)
    .slice(0, 4)
    .map((c) => {
      const expected = c.income - c.spend;
      const actual = reconciliations[c.startStr];
      const threshold = Math.max(50, c.income * 0.01);
      const diff = expected - actual;
      return { startStr: c.startStr, endStr: c.endStr, diff, accurate: Math.abs(diff) <= threshold };
    });
  const accurateTrackCount = reconciliationTrack.filter((c) => c.accurate).length;

  const handleLogGap = (amount: number) => {
    logUnaccountedGap(amount);
    setGapLoggedFor(payCycle.startStr);
    const newExpected = payCycle.expectedCashOnHand - amount;
    setReconciliation(payCycle.startStr, Math.max(0, Math.round(newExpected)));
  };

  const handleClearReconciliation = () => {
    setReconciliation(payCycle.startStr, null);
    setActualAmount("");
    setReconcileAnswer(null);
    setIsEditingReconciliation(false);
  };

  const [targetSavingsGoal, setTargetSavingsGoal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("continuum_target_savings_goal");
      if (saved) return parseFloat(saved) || 0;
    }
    return Math.max(0, Math.round(payCycle.totalIncome * 0.20));
  });

  const handleTargetSavingsChange = (val: number) => {
    const nextVal = Math.max(0, val);
    setTargetSavingsGoal(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("continuum_target_savings_goal", String(nextVal));
    }
  };

  const remainingDays = Math.max(1, payCycle.remainingDays);
  const daysThisWeek = Math.min(7, remainingDays);

  const unspentCash = Math.max(0, payCycle.totalIncome - payCycle.spentSoFar);

  const spendablePoolForTarget = unspentCash - targetSavingsGoal;

  const isBehindTarget = spendablePoolForTarget < 0;

  const grossDailyLimit = isBehindTarget ? 0 : spendablePoolForTarget / remainingDays;
  const grossWeekLimit = grossDailyLimit * daysThisWeek;

  const todayStr = toLocalDateStr(new Date());
  const todayObj = new Date();
  const dayOfWeek = todayObj.getDay();
  const sundayObj = new Date(todayObj);
  sundayObj.setDate(todayObj.getDate() - dayOfWeek);
  const weekStartStr = toLocalDateStr(sundayObj);

  const todaySpent = expenses
    .filter((e) => e.date === todayStr && typeof e.amount === "number")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const thisWeekSpent = expenses
    .filter((e) => e.date && e.date >= weekStartStr && e.date <= todayStr && typeof e.amount === "number")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const safeToday = Math.max(0, grossDailyLimit - todaySpent);
  const safeWeek = Math.max(0, grossWeekLimit - thisWeekSpent);

  const deficitToTarget = isBehindTarget ? Math.abs(spendablePoolForTarget) : 0;

  if (!isProUser) {
    return (
      <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] w-full">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-3xl italic font-normal tracking-wide text-text-primary">
                  Financial Health
                </h1>
                <span className="inline-flex shrink-0 items-center rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-text-muted uppercase">
                  Pro
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Target-driven daily spending limits, pay-cycle pace, cash reconciliation, and liquidity runway.
              </p>
            </div>
          </div>
          <span className="font-mono text-[10.5px] font-semibold text-text-secondary bg-bg-secondary px-3 py-1 rounded-full border border-border-subtle/50 shadow-2xs">
            Cycle {fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}
          </span>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 sm:p-7 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="flex flex-col gap-2 max-w-2xl">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-text-muted">
              Supporter Feature
            </span>
            <h2 className="font-serif text-2xl italic font-normal tracking-tight text-text-primary">
              Adaptive Pay-Cycles &amp; Liquidity Intelligence
            </h2>
            <p className="text-[13px] leading-relaxed text-text-secondary">
              Gain automated daily safe-spending limits, cash-on-hand reconciliations, weighted emergency runway analytics, and private Gemini AI advisory tailored to your salary schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClaimPro}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-text-primary bg-text-primary px-6 py-2.5 text-xs font-semibold text-bg-primary shadow-xs transition-all duration-200 hover:opacity-90 active:scale-95"
            >
              <span>Unlock with Pro</span>
              <span className="text-xs">→</span>
            </button>
            <a
              href="https://github.com/fal3n-4ngel/Continuum-Home#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-5 py-2.5 text-xs font-medium text-text-secondary shadow-2xs transition-all duration-200 hover:bg-bg-primary hover:text-text-primary hover:border-border-hover"
            >
              <span>Self-Host Free</span>
              <span className="font-mono text-[10px]">↗</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary text-text-primary">
                  <CalendarCheck size={18} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted">
                    Cycle Tracking
                  </span>
                  <h3 className="font-serif text-lg font-medium text-text-primary">
                    Adaptive Daily Spend Limits
                  </h3>
                </div>
              </div>
              <span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                Pace Calibration
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Dynamically calculates your safe daily allowance based on elapsed days, committed subscriptions, and your target savings percentage.
            </p>
            <div className="rounded-xl border border-border-subtle bg-bg-primary/50 p-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">Today&apos;s Safe Allowance</span>
              <span className="font-mono font-semibold text-text-primary">{currency}1,450 / day</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary text-text-primary">
                  <Wallet size={18} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted">
                    Balance Audit
                  </span>
                  <h3 className="font-serif text-lg font-medium text-text-primary">
                    Cash-on-Hand Reconciliation
                  </h3>
                </div>
              </div>
              <span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                Leak Detection
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Verify your physical bank balance against projected net cash at payday. Automatically records unaccounted gaps into your ledger.
            </p>
            <div className="rounded-xl border border-border-subtle bg-bg-primary/50 p-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">Cycle Audit Status</span>
              <span className="font-mono font-semibold text-[#2e7d32]">Balanced · 0% Unaccounted</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary text-text-primary">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted">
                    Safety Buffer
                  </span>
                  <h3 className="font-serif text-lg font-medium text-text-primary">
                    Emergency Liquidity Runway
                  </h3>
                </div>
              </div>
              <span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                Asset Weighted
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Measures emergency runway in months, applying tiered liquidity discounts across bank deposits, mutual funds, gold, and equity holdings.
            </p>
            <div className="rounded-xl border border-border-subtle bg-bg-primary/50 p-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">Liquid Reserve Health</span>
              <span className="font-mono font-semibold text-text-primary">6.4 Months Runway</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary text-text-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted">
                    AI Intelligence
                  </span>
                  <h3 className="font-serif text-lg font-medium text-text-primary">
                    Gemini AI Fiscal Advisory
                  </h3>
                </div>
              </div>
              <span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                Zero Cloud Leak
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Analyzes category anomalies, monthly burn trajectory, and generates actionable steps to preserve savings without touching raw ledger entries.
            </p>
            <div className="rounded-xl border border-border-subtle bg-bg-primary/50 p-3 flex items-center justify-between text-xs">
              <span className="text-text-muted">Model Execution</span>
              <span className="font-mono font-semibold text-text-primary">Gemini 2.5 Flash · Private</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-secondary/40 p-4 text-[11px] leading-relaxed text-text-muted flex flex-wrap items-center justify-between gap-2">
          <span>
            Continuum is 100% open-source under the MIT license. All Pro capabilities are permanently unlocked for self-hosted instances.
          </span>
          <a
            href="https://github.com/fal3n-4ngel/Continuum-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary underline font-medium"
          >
            View Repository on GitHub ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] w-full">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary">Financial Health</h1>
          <p className="mt-1 text-sm text-text-muted">
            Target-driven daily spending limits, pay-cycle pace, cash reconciliation, and liquidity runway.
          </p>
        </div>
        <span className="font-mono text-[10.5px] font-semibold text-text-secondary bg-bg-secondary px-3 py-1 rounded-full border border-border-subtle/50 shadow-2xs">
          Cycle {fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-bg-card p-4 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary shadow-2xs">
            <PiggyBank size={18} />
          </div>
          <div>
            <span className="text-xs font-bold text-text-primary">Target Savings Goal This Cycle</span>
            <p className="text-[11px] text-text-muted">Set how much you want to save — daily limits will update to guide you there.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-full bg-bg-secondary p-1 border border-border-subtle/40 shadow-2xs">
            {[0, 0.1, 0.2, 0.3].map((pct) => {
              const amount = Math.round(payCycle.totalIncome * pct);
              const isActive = targetSavingsGoal === amount || (pct === 0 && targetSavingsGoal === 0);
              const label = pct === 0 ? "0% (₹0)" : `${pct * 100}%`;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleTargetSavingsChange(amount)}
                  className={`cursor-pointer rounded-full border-none px-3.5 py-1 text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-bg-card text-text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06)] font-bold"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-32">
            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-text-muted">{currency}</span>
            <input
              type="number"
              min="0"
              value={targetSavingsGoal || ""}
              onChange={(e) => handleTargetSavingsChange(parseFloat(e.target.value) || 0)}
              placeholder="Target Goal"
              className="w-full rounded-full border border-border-subtle bg-bg-card py-1 pr-3 pl-7 text-xs font-bold text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus shadow-2xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 max-2xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        <div className={`${STAT_CARD} border-t-2 border-t-accent-blue/80`}>
          <div>
            <span className={LABEL_MONO}>TOTAL INCOME</span>
            <div className={STAT_VALUE}>
              {currency}
              {payCycle.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <span className={STAT_SUBTEXT}>Salary + additional this cycle</span>
        </div>

        <div className={`${STAT_CARD} border-t-2 border-t-border-subtle`}>
          <div>
            <span className={LABEL_MONO}>SPENT SO FAR</span>
            <div className={STAT_VALUE}>
              {currency}
              {payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <span className={STAT_SUBTEXT}>
            Day {payCycle.elapsedDays} of {payCycle.totalDays} ({payCycle.remainingDays}d left)
          </span>
        </div>

        <div className={`${STAT_CARD} border-t-2 border-t-border-subtle`}>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className={LABEL_MONO}>SAFE TODAY</span>
              <span
                className={`font-mono text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                  isBehindTarget
                    ? "text-text-muted bg-bg-secondary border-border-subtle"
                    : todaySpent > grossDailyLimit
                    ? "text-text-muted bg-bg-secondary border-border-subtle"
                    : "text-text-secondary bg-bg-secondary border-border-subtle"
                }`}
              >
                {isBehindTarget
                  ? "BEHIND TARGET"
                  : todaySpent > grossDailyLimit
                  ? "OVER TODAY LIMIT"
                  : "TO HIT TARGET"}
              </span>
            </div>
            <div
              className={STAT_VALUE}
            >
              {currency}
              {Math.floor(safeToday).toLocaleString("en-IN")}
            </div>
          </div>
          <span className={STAT_SUBTEXT}>
            {isBehindTarget
              ? `Behind goal by ${currency}${deficitToTarget.toLocaleString("en-IN")}`
              : todaySpent > 0
              ? `Spent ${currency}${Math.round(todaySpent).toLocaleString("en-IN")} today of ${currency}${Math.floor(grossDailyLimit).toLocaleString("en-IN")} limit`
              : `Spend max ${currency}${Math.floor(grossDailyLimit)}/day to save ${currency}${targetSavingsGoal.toLocaleString("en-IN")}`}
          </span>
        </div>

        <div className={`${STAT_CARD} border-t-2 border-t-border-subtle`}>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className={LABEL_MONO}>SAFE THIS WEEK</span>
              <span
                className={`font-mono text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                  isBehindTarget
                    ? "text-text-muted bg-bg-secondary border-border-subtle"
                    : thisWeekSpent > grossWeekLimit
                    ? "text-text-muted bg-bg-secondary border-border-subtle"
                    : "text-text-secondary bg-bg-secondary border-border-subtle"
                }`}
              >
                {isBehindTarget
                  ? "0 ALLOWED"
                  : thisWeekSpent > grossWeekLimit
                  ? "OVER WEEK LIMIT"
                  : "7-DAY LIMIT"}
              </span>
            </div>
            <div
              className={STAT_VALUE}
            >
              {currency}
              {Math.floor(safeWeek).toLocaleString("en-IN")}
            </div>
          </div>
          <span className={STAT_SUBTEXT}>
            {isBehindTarget
              ? "No margin left to hit target goal"
              : thisWeekSpent > 0
              ? `Spent ${currency}${Math.round(thisWeekSpent).toLocaleString("en-IN")} of ${currency}${Math.floor(grossWeekLimit).toLocaleString("en-IN")} 7-day budget`
              : `Next ${daysThisWeek} days allowance to reach goal`}
          </span>
        </div>

        <div className={`${STAT_CARD} border-t-2 border-t-border-subtle`}>
          <div>
            <span className={LABEL_MONO}>EXPECTED SAVINGS Predicted</span>
            <div className={STAT_VALUE}>
              {payCycle.expectedSavings >= 0 ? "+" : ""}
              {currency}
              {payCycle.expectedSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
          </div>
          <span className={STAT_SUBTEXT}>{payCycle.savingsRate.toFixed(1)}% of income</span>
        </div>
      </div>

      <GeminiHealthAnalytics
        currency={currency}
        payCycle={payCycle}
        targetSavingsGoal={targetSavingsGoal}
        portfolioValue={portfolioValue}
        getHeaders={getHeaders}
      />

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <div className={`${BENTO_CARD} border-t-2 border-t-accent-blue/80`}>
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-text-primary">
                <Calendar className="h-5 w-5 text-text-secondary" strokeWidth={2} /> Current Pay Cycle Pace
              </h2>
              <span className="text-[11px] font-medium text-text-muted">
                {fmtDate(payCycle.startStr)} – {fmtDate(payCycle.endStr)}
              </span>
            </div>

            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className="h-full rounded-full bg-text-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, (payCycle.elapsedDays / payCycle.totalDays) * 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] text-text-muted">
                <span>Day {payCycle.elapsedDays} of {payCycle.totalDays}</span>
                <span>{payCycle.remainingDays} days left</span>
              </div>
            </div>

            <div className="mt-4">
              {payCycle.paceDeltaPct === null ? (
                <p className="text-[11px] text-text-muted">No prior cycle data to compare pace against yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">Same day last cycle</span>
                    <span className="font-semibold text-text-primary">
                      {currency}
                      {payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      <span className="mx-1 font-normal text-text-muted">vs</span>
                      {currency}
                      {payCycle.prevCycleSpendToSameDay.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-[11px] leading-relaxed ${
                      payCycle.paceDeltaPct > 5
                        ? "border-rose-200/50 bg-rose-50/50 text-rose-800"
                        : payCycle.paceDeltaPct < -5
                        ? "border-emerald-200/50 bg-emerald-50/50 text-emerald-800"
                        : "border-border-subtle bg-bg-primary text-text-secondary"
                    }`}
                  >
                    {payCycle.paceDeltaPct > 5 ? (
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                    ) : payCycle.paceDeltaPct < -5 ? (
                      <TrendingDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                    ) : (
                      <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                    )}
                    <span>
                      On pace to spend <strong>{payCycle.paceDeltaPct >= 0 ? "+" : ""}{payCycle.paceDeltaPct.toFixed(1)}%</strong> vs. last cycle (<strong>{currency}{payCycle.prevCycleSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> total).
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-border-subtle pt-3 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Spent so far (logged)</span>
                <span className="font-mono font-semibold text-text-primary">
                  {currency}
                  {payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Rest of cycle (projected)</span>
                <span className="font-mono font-semibold text-text-primary">
                  {currency}
                  {payCycle.projectedRemaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-1.5 font-semibold">
                <span className="text-text-primary">Projected Total Spend</span>
                <span className="font-mono font-bold text-text-primary">
                  {currency}
                  {payCycle.projectedTotalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          {catEntries.length > 0 && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <span className={`${LABEL_MONO} mb-2 block`}>Top Categories This Cycle</span>
              <div className="space-y-2">
                {catEntries.slice(0, 4).map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="mb-0.5 flex justify-between text-[11px]">
                      <span className="text-text-secondary">{cat}</span>
                      <span className="font-semibold text-text-primary">
                        {currency}
                        {amt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full bg-text-primary"
                        style={{ width: `${maxCatAmount > 0 ? (amt / maxCatAmount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`${BENTO_CARD} border-t-2 border-t-[#e39282]/80`}>
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-1 rounded-full bg-bg-secondary p-1 border border-border-subtle/40 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRightTab("reconcile")}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    rightTab === "reconcile"
                      ? "bg-bg-card text-text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06)] font-bold"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <ScanSearch size={14} /> Reconcile Cash
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("income")}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    rightTab === "income"
                      ? "bg-bg-card text-text-primary shadow-[0_2px_4px_rgba(0,0,0,0.06)] font-bold"
                      : "bg-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Settings2 size={14} /> Payday &amp; Income
                </button>
              </div>
            </div>

            {rightTab === "reconcile" ? (
              <div className="mt-4 space-y-4">
                {showRecordedSummary ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] leading-relaxed text-text-secondary">Confirmed cash left:</p>
                    <p className="text-[26px] font-bold text-text-primary">
                      {currency}
                      {confirmedCashLeft.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Expected {currency}
                      {payCycle.expectedCashOnHand.toLocaleString("en-IN", { maximumFractionDigits: 0 })} based on logged transactions.
                    </p>

                    {discrepancy !== null && discrepancy > DISCREPANCY_THRESHOLD && (
                      <div className="flex flex-col gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2.5 text-[11px] leading-relaxed text-rose-800">
                        <span>
                          <strong>{currency}{discrepancy.toLocaleString("en-IN", { maximumFractionDigits: 0 })} unaccounted for.</strong> Cash spending or an unlogged expense is likely missing.
                        </span>
                        {gapLoggedFor === payCycle.startStr ? (
                          <span className="text-[10px] font-semibold text-emerald-700">✓ Logged as an expense</span>
                        ) : (
                          <button
                            onClick={() => handleLogGap(discrepancy)}
                            className="cursor-pointer self-start rounded-md border border-rose-300/60 bg-bg-card/60 px-2 py-1 text-[10px] font-semibold text-rose-800 transition-colors hover:bg-bg-card"
                          >
                            Log {currency}{discrepancy.toLocaleString("en-IN", { maximumFractionDigits: 0 })} as unaccounted expense
                          </button>
                        )}
                      </div>
                    )}
                    {discrepancy !== null && discrepancy < -DISCREPANCY_THRESHOLD && (
                      <div className="flex flex-col gap-2 rounded-lg border border-blue-200/50 bg-blue-50/50 p-2.5 text-[11px] leading-relaxed text-blue-800">
                        <span>
                          <strong>{currency}{Math.abs(discrepancy).toLocaleString("en-IN", { maximumFractionDigits: 0 })} extra cash.</strong> You have more cash left than expected (unlogged income or deposit).
                        </span>
                        {gapLoggedFor === payCycle.startStr ? (
                          <span className="text-[10px] font-semibold text-emerald-700">✓ Logged as income</span>
                        ) : (
                          <button
                            onClick={() => handleLogGap(discrepancy)}
                            className="cursor-pointer self-start rounded-md border border-blue-300/60 bg-bg-card/60 px-2 py-1 text-[10px] font-semibold text-blue-800 transition-colors hover:bg-bg-card"
                          >
                            Log {currency}{Math.abs(discrepancy).toLocaleString("en-IN", { maximumFractionDigits: 0 })} as unaccounted income
                          </button>
                        )}
                      </div>
                    )}
                    {discrepancy !== null && Math.abs(discrepancy) <= DISCREPANCY_THRESHOLD && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800">
                        <span>✓</span>
                        <span>Log is tracking accurately.</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => setIsEditingReconciliation(true)}
                        className="cursor-pointer text-[10px] font-medium text-text-muted underline hover:text-text-primary transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleClearReconciliation}
                        className="cursor-pointer text-[10px] font-medium text-rose-600/80 underline hover:text-rose-700 transition-colors"
                      >
                        Clear Reconciliation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] text-text-secondary">
                      Based on {currency}{payCycle.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })} income and {currency}{payCycle.spentSoFar.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent, expected balance is:
                    </p>
                    <div className="text-[26px] font-bold text-text-primary">
                      {currency}{payCycle.expectedCashOnHand.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>

                    {reconcileAnswer !== "no" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={confirmMatches} className={`${BTN_PRIMARY} flex-1 text-xs`}>
                          ✓ That's Right
                        </button>
                        <button onClick={() => setReconcileAnswer("no")} className={`${BTN_SECONDARY} flex-1 text-xs`}>
                          I Have Less
                        </button>
                      </div>
                    )}

                    {reconcileAnswer === "no" && (
                      <div className="flex flex-col gap-2.5">
                        <label className="text-[10px] text-text-muted">What do you actually have left?</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-2.5 flex items-center text-[11px] text-text-muted">
                            {currency}
                          </span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={actualAmount}
                            onChange={(e) => setActualAmount(e.target.value)}
                            className="w-full rounded-md border border-border-subtle bg-bg-card py-1.5 pr-2 pl-7 text-xs text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={saveActualAmount}
                            disabled={isNaN(parsedActual)}
                            className={`${BTN_PRIMARY} flex-1 text-xs disabled:opacity-50`}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setReconcileAnswer(null);
                              setActualAmount("");
                              setIsEditingReconciliation(false);
                            }}
                            className="cursor-pointer text-[10px] text-text-muted underline hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                          {savedReconciliation !== undefined && (
                            <button
                              onClick={handleClearReconciliation}
                              className="cursor-pointer text-[10px] text-rose-600/80 underline hover:text-rose-700 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-border-subtle pt-3">
                  <span className={LABEL_MONO}>Reconciliation Track Record</span>
                  {reconciliationTrack.length === 0 ? (
                    <p className="mt-1 text-[10.5px] text-text-muted">Past cycle accuracy will appear here once reconciled.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5 text-[11px]">
                      {reconciliationTrack.map((c) => (
                        <div key={c.startStr} className="flex justify-between">
                          <span className="text-text-secondary">
                            {fmtDate(c.startStr)} – {fmtDate(c.endStr)}
                          </span>
                          {c.accurate ? (
                            <span className="font-semibold text-emerald-700">✓ Accurate</span>
                          ) : (
                            <span className="font-semibold text-rose-700">
                              −{currency}{Math.abs(c.diff).toLocaleString("en-IN", { maximumFractionDigits: 0 })} short
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <span className={LABEL_MONO}>This Cycle's Payday Date &amp; Amount</span>
                  {loggedPayday && !isEditingPayday ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-800">
                      <span>
                        Logged <strong>{currency}{loggedPayday.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong> on {fmtDate(loggedPayday.date)}
                      </span>
                      <button onClick={() => setIsEditingPayday(true)} className="cursor-pointer text-[10px] underline">
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          lang="en-CA"
                          value={paydayDate}
                          onChange={(e) => setPaydayDate(e.target.value)}
                          className="rounded-md border border-border-subtle bg-bg-card p-2 text-xs text-text-primary outline-none"
                        />
                        <input
                          type="number"
                          value={paydayAmount}
                          onChange={(e) => setPaydayAmount(e.target.value)}
                          placeholder="Amount"
                          className="rounded-md border border-border-subtle bg-bg-card p-2 text-xs text-text-primary outline-none"
                        />
                      </div>
                      <button onClick={savePayday} className={`${BTN_PRIMARY} w-full py-1.5 text-xs`}>
                        Save Payday Record
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border-subtle pt-3 space-y-3">
                  <span className={LABEL_MONO}>Base Recurring Monthly Income</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10.5px] text-text-muted">Usual Salary ({currency})</label>
                      <input
                        type="number"
                        value={salaryDraft}
                        onChange={(e) => setSalaryDraft(e.target.value)}
                        onBlur={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setSalaryDraft(String(val) || "");
                          setMonthlySalary(val);
                        }}
                        placeholder="0"
                        className="mt-1 w-full rounded-md border border-border-subtle bg-bg-card p-2 text-xs text-text-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-text-muted">Add. Income ({currency})</label>
                      <input
                        type="number"
                        value={additionalIncomeDraft}
                        onChange={(e) => setAdditionalIncomeDraft(e.target.value)}
                        onBlur={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setAdditionalIncomeDraft(String(val) || "");
                          setAdditionalIncome(val);
                        }}
                        placeholder="0"
                        className="mt-1 w-full rounded-md border border-border-subtle bg-bg-card p-2 text-xs text-text-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
        <div className={`${BENTO_CARD} border-t-2 border-t-[#2e7d32]/70`}>
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-text-primary">
                <Shield className="h-5 w-5 text-text-secondary" strokeWidth={2} /> Emergency Runway
              </h2>
              <span className="font-mono text-[10px] font-semibold text-text-muted uppercase">IF INCOME STOPS</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[32px] font-bold tracking-tight text-text-primary">
                {emergencyRunwayMonths !== null ? emergencyRunwayMonths.toFixed(1) : "0.0"}
              </span>
              <span className="text-sm font-medium text-text-muted">months of runway</span>
            </div>

            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Accessible liquid reserves ({currency}{accessibleReserve.toLocaleString("en-IN", { maximumFractionDigits: 0 })}) divided by monthly burn ({currency}{monthlyBurn.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/mo).
            </p>

            {emergencyRunwayMonths !== null && emergencyRunwayMonths < 3 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200/50 bg-rose-50/50 p-2.5 text-[11px] text-rose-800">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Under 3 months runway. Consider expanding cash reserves for job loss security.</span>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="cursor-pointer text-[10.5px] font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1"
            >
              <span>{showMethodology ? "Hide" : "Show"} Liquidity Haircut Methodology</span>
            </button>
            {showMethodology && (
              <div className="mt-2.5 space-y-1 text-[10px] text-text-muted bg-bg-primary p-3 rounded-lg border border-border-subtle">
                <p className="font-semibold text-text-primary mb-1">Liquidity Haircuts Applied:</p>
                <div className="grid grid-cols-2 gap-1">
                  <span>Cash: 100%</span>
                  <span>Gold: 95%</span>
                  <span>Mutual Funds / SIP: 90%</span>
                  <span>Fixed Deposit: 75%</span>
                  <span>Equities: 80%</span>
                  <span>Crypto: 65%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`${BENTO_CARD} border-t-2 border-t-text-primary/60`}>
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h2 className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-text-primary">
                <BarChart3 className="h-5 w-5 text-text-secondary" strokeWidth={2} /> Cycle History &amp; Averages
              </h2>
              {cycleAverages && (
                <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded">
                  Avg Savings: {currency}{cycleAverages.avgSavings.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({cycleAverages.avgSavingsRate.toFixed(1)}%)
                </span>
              )}
            </div>

            {cycleHistory.length === 0 ? (
              <p className="mt-4 text-xs text-text-muted">No completed cycle history available yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-border-subtle text-[10px] font-semibold text-text-muted uppercase font-mono">
                      <th className="py-2">Cycle</th>
                      <th className="py-2 text-right">Income</th>
                      <th className="py-2 text-right">Spend</th>
                      <th className="py-2 text-right">Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {cycleHistory.slice(0, 5).map((c) => (
                      <tr key={c.startStr}>
                        <td className="py-2 font-medium text-text-primary">
                          {fmtDate(c.startStr)} – {fmtDate(c.endStr)}
                        </td>
                        <td className="py-2 text-right font-mono text-text-secondary">
                          {currency}{c.income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 text-right font-mono text-text-secondary">
                          {currency}{c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold" style={{ color: c.savings >= 0 ? "#16a34a" : "#b3666b" }}>
                          {c.savings >= 0 ? "+" : ""}{currency}{c.savings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
