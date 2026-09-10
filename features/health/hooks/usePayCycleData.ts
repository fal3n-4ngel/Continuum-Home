import { useMemo } from "react";
import { Expense, Subscription } from "@/types";
import { resolvePayCycle, buildCycleHistory, toLocalDateStr } from "@/lib/utils";

export interface PayCycleCalculation {
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

export interface CycleHistoryItem {
  startStr: string;
  endStr: string;
  income: number;
  spend: number;
  savings: number;
  isSalaryLogged: boolean;
  hasData: boolean;
}

export interface CycleAverages {
  avgIncome: number;
  avgSpend: number;
  avgSavings: number;
  avgSavingsRate: number;
  cycleCount: number;
}

interface UsePayCycleDataOptions {
  expenses: Expense[];
  subscriptions: Subscription[];
  salaryDay: number;
  salaryLog: Record<string, { date: string; amount: number }>;
  monthlySalary: number;
  additionalIncome: number;
}

const CYCLE_HISTORY_DEPTH = 7;
const BLACKOUT_DAYS = 2;
const WARMUP_DAYS = 7;
const HISTORY_CYCLES_FOR_BASELINE = 3;

export function usePayCycleData({
  expenses,
  subscriptions,
  salaryDay,
  salaryLog,
  monthlySalary,
  additionalIncome,
}: UsePayCycleDataOptions) {
  const cycleHistoryRaw = useMemo(
    () => buildCycleHistory(salaryDay, salaryLog, CYCLE_HISTORY_DEPTH),
    [salaryDay, salaryLog]
  );

  const payCycle = useMemo<PayCycleCalculation>(() => {
    const { startStr, endStr, loggedAmount, prevStartStr, prevEndStr } = resolvePayCycle(salaryDay, salaryLog);
    const todayStr = toLocalDateStr(new Date());
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);

    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const elapsedDays = Math.min(totalDays, Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1));
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const cycleExpensesSoFar = expenses.filter((e) => e.date && e.date >= startStr && e.date <= todayStr);
    const spentSoFar = cycleExpensesSoFar.reduce((acc, e) => acc + (e.amount || 0), 0);

    const subMonthlyCost = subscriptions.reduce((acc, sub) => {
      let cost = sub.cost || 0;
      if (sub.billingCycle === "yearly") cost = cost / 12;
      return acc + cost;
    }, 0);

    const prevCycleExpenses = expenses.filter((e) => e.date && e.date >= prevStartStr && e.date <= prevEndStr);
    const prevSameDayEnd = new Date(`${prevStartStr}T00:00:00`);
    prevSameDayEnd.setDate(prevSameDayEnd.getDate() + elapsedDays - 1);
    const prevSameDayEndStr = toLocalDateStr(prevSameDayEnd);
    const prevCycleSpendToSameDay = prevCycleExpenses
      .filter((e) => e.date! <= prevSameDayEndStr)
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    const prevCycleTransactional = prevCycleExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const prevCycleSpend = prevCycleTransactional + subMonthlyCost;

    const paceConfidence = Math.max(0, Math.min(1, (elapsedDays - BLACKOUT_DAYS) / WARMUP_DAYS));
    const dailyPace = elapsedDays > 0 ? spentSoFar / elapsedDays : 0;
    const paceProjectedTransactional = dailyPace * totalDays;

    const pastCyclesSpend = cycleHistoryRaw
      .slice(1, 1 + HISTORY_CYCLES_FOR_BASELINE)
      .map((c) => expenses.filter((e) => e.date && e.date >= c.startStr && e.date <= c.endStr).reduce((acc, e) => acc + (e.amount || 0), 0))
      .filter((v) => v > 0);
    const historicalBaselineTransactional =
      pastCyclesSpend.length > 0 ? pastCyclesSpend.reduce((a, b) => a + b, 0) / pastCyclesSpend.length : prevCycleTransactional;

    const projectedTransactional =
      historicalBaselineTransactional > 0
        ? paceConfidence * paceProjectedTransactional + (1 - paceConfidence) * historicalBaselineTransactional
        : paceProjectedTransactional;

    const hasLedgerHistory = historicalBaselineTransactional > 0 || spentSoFar > 0;
    const projectedTotalSpend = hasLedgerHistory ? projectedTransactional : subMonthlyCost;

    const salaryThisCycle = loggedAmount ?? monthlySalary;
    const totalIncome = salaryThisCycle + additionalIncome;
    const expectedCashOnHand = totalIncome - spentSoFar;
    const expectedSavings = totalIncome - projectedTotalSpend;
    const savingsRate = totalIncome > 0 ? (expectedSavings / totalIncome) * 100 : 0;

    const paceDeltaPct = prevCycleSpend > 0 ? ((projectedTotalSpend - prevCycleSpend) / prevCycleSpend) * 100 : null;

    const cycleCatBreakdown: Record<string, number> = {};
    cycleExpensesSoFar.forEach((e) => {
      const cat = e.category || "Uncategorized";
      cycleCatBreakdown[cat] = (cycleCatBreakdown[cat] || 0) + (e.amount || 0);
    });

    return {
      startStr,
      endStr,
      totalDays,
      elapsedDays,
      remainingDays,
      spentSoFar,
      subMonthlyCost,
      projectedTotalSpend,
      committedSpend: subMonthlyCost,
      projectedRemaining: Math.max(0, projectedTotalSpend - spentSoFar),
      paceConfidence,
      totalIncome,
      isSalaryLogged: loggedAmount !== null,
      expectedCashOnHand,
      expectedSavings,
      savingsRate,
      prevCycleSpend,
      prevCycleSpendToSameDay,
      paceDeltaPct,
      cycleCatBreakdown: Object.fromEntries(Object.entries(cycleCatBreakdown).sort(([, a], [, b]) => b - a)) as Record<string, number>,
    };
  }, [expenses, subscriptions, salaryDay, salaryLog, monthlySalary, additionalIncome, cycleHistoryRaw]);

  const cycleHistory = useMemo<CycleHistoryItem[]>(() => {
    return cycleHistoryRaw
      .slice(1)
      .map((c) => {
        const cycleExpenses = expenses.filter((e) => e.date && e.date >= c.startStr && e.date <= c.endStr);
        const transactional = cycleExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const spend = transactional + payCycle.subMonthlyCost;
        const income = (c.loggedAmount ?? monthlySalary) + additionalIncome;
        return {
          startStr: c.startStr,
          endStr: c.endStr,
          income,
          spend,
          savings: income - spend,
          isSalaryLogged: c.loggedAmount !== null,
          hasData: cycleExpenses.length > 0 || c.loggedAmount !== null,
        };
      })
      .filter((c) => c.hasData);
  }, [cycleHistoryRaw, expenses, monthlySalary, additionalIncome, payCycle.subMonthlyCost]);

  const cycleAverages = useMemo<CycleAverages | null>(() => {
    if (cycleHistory.length === 0) return null;
    const avgIncome = cycleHistory.reduce((a, c) => a + c.income, 0) / cycleHistory.length;
    const avgSpend = cycleHistory.reduce((a, c) => a + c.spend, 0) / cycleHistory.length;
    const avgSavings = avgIncome - avgSpend;
    return {
      avgIncome,
      avgSpend,
      avgSavings,
      avgSavingsRate: avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0,
      cycleCount: cycleHistory.length,
    };
  }, [cycleHistory]);

  return { payCycle, cycleHistory, cycleAverages };
}
