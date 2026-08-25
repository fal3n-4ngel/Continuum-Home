// Fixed sample data for admin email previews.
//
// Previews render through the *same* template functions the crons use, so the
// only difference between a preview and a real send is this data plus the
// `isPreview` banner. That is what keeps previews honest — a template change
// cannot land in production without also changing what the preview shows.

import type { PortfolioEmailData } from "./templates/portfolio";
import type { ExpensesEmailData, ExpensePeriod } from "./templates/expenses";
import type { SubscriptionsEmailData } from "./templates/subscriptions";

function todayLabel(): string {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function samplePortfolio(appUrl: string, unsubscribeUrl?: string): PortfolioEmailData {
  return {
    todayStr: todayLabel(),
    totalCurrent: 486320.75,
    totalInvested: 425000,
    overallPnl: 61320.75,
    overallPnlPercent: 14.43,
    dailyChange: 3240.5,
    weeklyChange: -1180.25,
    holdings: [
      { name: "RELIANCE", category: "equity", quantity: 25, currentPrice: 2612.4, currentValue: 65310, pnl: 5310, pnlPercent: 8.85 },
      { name: "INFY", category: "equity", quantity: 40, currentPrice: 1489.2, currentValue: 59568, pnl: -2432, pnlPercent: -3.92 },
      { name: "Parag Parikh Flexi Cap", category: "mutual_fund", quantity: 512.33, currentPrice: 71.8, currentValue: 36785.29, pnl: 4785.29, pnlPercent: 14.95 },
      { name: "BTC", category: "crypto", quantity: 0.05, currentPrice: 5420000, currentValue: 271000, pnl: 51000, pnlPercent: 23.18 },
      { name: "HDFC Fixed Deposit", category: "fixed_deposit", quantity: 1, currentPrice: 53657.46, currentValue: 53657.46, pnl: 2657.46, pnlPercent: 5.21 },
    ],
    usdToInr: 83.42,
    appUrl,
    unsubscribeUrl,
    isPreview: true,
  };
}

export function sampleExpenses(period: ExpensePeriod, appUrl: string, unsubscribeUrl?: string): ExpensesEmailData {
  const days = period === "monthly" ? 30 : 7;
  const total = period === "monthly" ? 48620.5 : 11240.75;

  return {
    period,
    periodRange: `${isoDaysFromNow(-days)} to ${isoDaysFromNow(0)}`,
    totalAmount: total,
    avgDaily: total / days,
    categories: [
      { name: "Food & Dining", amount: total * 0.34, percentage: 34 },
      { name: "Transport", amount: total * 0.22, percentage: 22 },
      { name: "Infrastructure", amount: total * 0.19, percentage: 19 },
      { name: "Entertainment", amount: total * 0.15, percentage: 15 },
      { name: "Uncategorized", amount: total * 0.1, percentage: 10 },
    ],
    topExpenses: [
      { title: "Cloud Hosting Renewal", category: "Infrastructure", date: isoDaysFromNow(-2), amount: total * 0.19 },
      { title: "Weekend Groceries", category: "Food & Dining", date: isoDaysFromNow(-3), amount: total * 0.14 },
      { title: "Airport Cab", category: "Transport", date: isoDaysFromNow(-4), amount: total * 0.12 },
      { title: "Concert Tickets", category: "Entertainment", date: isoDaysFromNow(-5), amount: total * 0.11 },
      { title: "Misc Purchase", category: null, date: isoDaysFromNow(-6), amount: total * 0.08 },
    ],
    appUrl,
    unsubscribeUrl,
    isPreview: true,
  };
}

export function sampleSubscriptions(appUrl: string, unsubscribeUrl?: string): SubscriptionsEmailData {
  return {
    renewals: [
      { name: "GitHub Copilot", icon: "💻", cost: 830, billingCycle: "monthly", nextBillingDate: isoDaysFromNow(2), daysUntil: 2 },
      { name: "Netflix", icon: "🎬", cost: 649, billingCycle: "monthly", nextBillingDate: isoDaysFromNow(3), daysUntil: 3 },
      { name: "Adobe Creative Cloud", icon: null, cost: 4230, billingCycle: "yearly", nextBillingDate: isoDaysFromNow(3), daysUntil: 3 },
    ],
    appUrl,
    unsubscribeUrl,
    isPreview: true,
  };
}
