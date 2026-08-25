import { describe, it, expect } from "vitest";
import { computeFdValue, getEffectiveAmount, daysUntil } from "@/lib/finance";

describe("Fixed Deposit Financial Math Tests", () => {
  it("calculates compound interest correctly for 1 year at 10% quarterly compounding", () => {
    const principal = 100000;
    const rate = 10;
    const startDate = "2025-01-01";
    const asOf = new Date("2026-01-01T00:00:00Z");

    const val = computeFdValue(principal, rate, startDate, "quarterly", asOf);
    expect(Math.round(val)).toBe(110374);
  });

  it("caps FD value growth after maturity date", () => {
    const principal = 100000;
    const rate = 10;
    const startDate = "2025-01-01";
    const maturityDate = "2026-01-01";
    const asOf2026 = new Date("2026-01-01T00:00:00Z");
    const asOf2027 = new Date("2027-01-01T00:00:00Z");

    const val2026 = computeFdValue(principal, rate, startDate, "quarterly", asOf2026, maturityDate);
    const val2027 = computeFdValue(principal, rate, startDate, "quarterly", asOf2027, maturityDate);

    expect(val2026).toBe(val2027);
  });

  it("returns effective amount for non-FD categories directly", () => {
    const asset = {
      category: "equity",
      amount: 45000,
    };
    expect(getEffectiveAmount(asset)).toBe(45000);
  });

  it("calculates daysUntil correctly", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const target = "2026-08-10";
    expect(daysUntil(target, from)).toBe(9);
  });
});
