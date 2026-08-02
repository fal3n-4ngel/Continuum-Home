// Fixed Deposit valuation math — shared by the client (live display in
// InvestmentsTab/FinancialHealthTab) and the daily cron email, so an FD's
// value reflects accrued interest automatically instead of requiring the
// user to manually bump "amount" every time they look at the dashboard.

export type FdCompounding = "monthly" | "quarterly" | "half_yearly" | "yearly";

export const FD_COMPOUNDING_LABELS: Record<FdCompounding, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
};

const PERIODS_PER_YEAR: Record<FdCompounding, number> = {
  monthly: 12,
  quarterly: 4,
  half_yearly: 2,
  yearly: 1,
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function yearsBetween(startDate: string, asOf: Date): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const diff = asOf.getTime() - start;
  return diff > 0 ? diff / MS_PER_YEAR : 0;
}

// Standard compound interest: A = P * (1 + r/n)^(n*t). Growth is capped at
// the maturity date — once an FD matures, banks stop compounding at the
// contracted rate (it's either renewed at a new rate or swept to a savings
// account), so projecting further at the original rate would overstate the
// balance.
export function computeFdValue(
  principal: number,
  annualRatePct: number,
  startDate: string,
  compounding: FdCompounding,
  asOf: Date,
  maturityDate?: string
): number {
  if (!principal || !annualRatePct || !startDate) return principal || 0;
  const cappedAsOf =
    maturityDate && asOf.getTime() > new Date(`${maturityDate}T00:00:00Z`).getTime()
      ? new Date(`${maturityDate}T00:00:00Z`)
      : asOf;
  const t = yearsBetween(startDate, cappedAsOf);
  if (t <= 0) return principal;
  const n = PERIODS_PER_YEAR[compounding] ?? 4;
  const rate = annualRatePct / 100;
  return principal * Math.pow(1 + rate / n, n * t);
}

export function computeFdMaturityValue(
  principal: number,
  annualRatePct: number,
  startDate: string,
  maturityDate: string,
  compounding: FdCompounding
): number {
  return computeFdValue(principal, annualRatePct, startDate, compounding, new Date(`${maturityDate}T00:00:00Z`));
}

export function daysUntil(dateStr: string, from: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.ceil((target - from.getTime()) / (24 * 60 * 60 * 1000));
}

interface FdLikeAsset {
  category: string;
  amount: number;
  investedAmount?: number;
  interestRate?: number;
  startDate?: string;
  maturityDate?: string;
  compounding?: FdCompounding;
}

// Single source of truth for "what is this asset actually worth right now."
// For every non-FD category the stored `amount` is authoritative (kept fresh
// by live price sync). For an FD there's no live price feed, so the accrued
// value is derived from the interest terms instead of trusting a possibly
// stale stored `amount`.
export function getEffectiveAmount(asset: FdLikeAsset, asOf: Date = new Date()): number {
  if (asset.category === "fixed_deposit" && asset.interestRate && asset.startDate) {
    const principal = asset.investedAmount ?? asset.amount;
    return computeFdValue(principal, asset.interestRate, asset.startDate, asset.compounding || "quarterly", asOf, asset.maturityDate);
  }
  return asset.amount;
}
