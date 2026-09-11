import { describe, it, expect } from "vitest";
import {
  calculateDailyAndWeeklyLimits,
  calculateEmergencyRunway,
} from "@/features/health/lib/financial-math";

describe("features/health/lib/financial-math unit tests", () => {
  it("calculates balanced forward-looking daily and weekly spending limits", () => {
    const limits = calculateDailyAndWeeklyLimits({
      totalIncome: 50000,
      spentSoFar: 10000,
      targetSavingsGoal: 15000,
      remainingDays: 14,
      todaySpent: 300,
    });

    expect(limits.unspentCash).toBe(40000);
    expect(limits.spendablePoolForTarget).toBe(25000);
    expect(limits.isBehindTarget).toBe(false);
    expect(limits.daysThisWeek).toBe(7);

    const expectedGrossDaily = 25000 / 14;
    expect(limits.grossDailyLimit).toBeCloseTo(expectedGrossDaily, 2);
    expect(limits.grossWeekLimit).toBeCloseTo(expectedGrossDaily * 7, 2);

    expect(limits.safeToday).toBeCloseTo(expectedGrossDaily - 300, 2);
    expect(limits.safeWeek).toBeCloseTo(expectedGrossDaily * 7 - 300, 2);

    expect(limits.safeWeek).toBeGreaterThanOrEqual(limits.safeToday);
  });

  it("handles end-of-cycle where remaining days is less than 7", () => {
    const limits = calculateDailyAndWeeklyLimits({
      totalIncome: 60000,
      spentSoFar: 40000,
      targetSavingsGoal: 10000,
      remainingDays: 3,
      todaySpent: 0,
    });

    expect(limits.remainingDays).toBe(3);
    expect(limits.daysThisWeek).toBe(3);

    const grossDaily = 10000 / 3;
    expect(limits.grossDailyLimit).toBeCloseTo(grossDaily, 2);
    expect(limits.grossWeekLimit).toBeCloseTo(10000, 2);
    expect(limits.safeToday).toBeCloseTo(grossDaily, 2);
    expect(limits.safeWeek).toBeCloseTo(10000, 2);
  });

  it("returns zero limits and accurate deficit when behind target savings goal", () => {
    const limits = calculateDailyAndWeeklyLimits({
      totalIncome: 50000,
      spentSoFar: 45000,
      targetSavingsGoal: 10000,
      remainingDays: 10,
      todaySpent: 200,
    });

    expect(limits.unspentCash).toBe(5000);
    expect(limits.spendablePoolForTarget).toBe(-5000);
    expect(limits.isBehindTarget).toBe(true);
    expect(limits.grossDailyLimit).toBe(0);
    expect(limits.grossWeekLimit).toBe(0);
    expect(limits.safeToday).toBe(0);
    expect(limits.safeWeek).toBe(0);
    expect(limits.deficitToTarget).toBe(5000);
  });

  it("clamps safeToday to 0 when todaySpent exceeds grossDailyLimit without zeroing out remaining week", () => {
    const limits = calculateDailyAndWeeklyLimits({
      totalIncome: 70000,
      spentSoFar: 0,
      targetSavingsGoal: 0,
      remainingDays: 14,
      todaySpent: 6000,
    });

    expect(limits.grossDailyLimit).toBe(5000);
    expect(limits.grossWeekLimit).toBe(35000);
    expect(limits.safeToday).toBe(0);
    expect(limits.safeWeek).toBe(29000);
  });

  it("calculates emergency runway in months based on accessible reserves and burn rate", () => {
    const runway = calculateEmergencyRunway({
      accessibleReserve: 300000,
      projectedTotalSpend: 50000,
      totalDays: 30,
    });

    expect(runway).toBe(6);
  });

  it("returns null for runway when reserve or burn is zero or negative", () => {
    expect(
      calculateEmergencyRunway({
        accessibleReserve: 0,
        projectedTotalSpend: 50000,
        totalDays: 30,
      })
    ).toBeNull();

    expect(
      calculateEmergencyRunway({
        accessibleReserve: 100000,
        projectedTotalSpend: 0,
        totalDays: 30,
      })
    ).toBeNull();
  });
});
