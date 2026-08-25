import { ExpenseRecord, InvestmentAsset, Subscription } from "@/types";
import { getEffectiveAmount } from "@/lib/finance";

export function calculateTotalExpenses(expenses: ExpenseRecord[]): number {
  return expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function calculatePortfolioMetrics(assets: InvestmentAsset[]) {
  let totalCurrentValue = 0;
  let totalInvestedValue = 0;

  assets.forEach((asset) => {
    if (asset.isSold) return;
    const current = getEffectiveAmount(asset);
    const invested = asset.investedAmount ?? asset.amount;

    totalCurrentValue += current;
    totalInvestedValue += invested;
  });

  const absoluteReturn = totalCurrentValue - totalInvestedValue;
  const percentageReturn = totalInvestedValue > 0 ? (absoluteReturn / totalInvestedValue) * 100 : 0;

  return {
    totalCurrentValue,
    totalInvestedValue,
    absoluteReturn,
    percentageReturn,
  };
}

export function calculateMonthlySubscriptionCost(subscriptions: Subscription[]): number {
  return subscriptions.reduce((total, sub) => {
    if (sub.billingCycle === "yearly") {
      return total + sub.cost / 12;
    }
    return total + sub.cost;
  }, 0);
}
