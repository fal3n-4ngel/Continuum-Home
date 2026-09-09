import { describe, it, expect } from "vitest";
import { resolvePayCycle, toLocalDateStr } from "@/lib/utils/dates";
import { Expense } from "@/types";

describe("Expenses Ledger Time & Pay Period Filtering", () => {
  const sampleExpenses: Expense[] = [
    { id: "1", title: "Recent coffee", amount: 150, date: "2026-09-08", category: "Food", notes: null, createdAt: 1000 },
    { id: "2", title: "Mid-month groceries", amount: 2000, date: "2026-09-02", category: "Food", notes: null, createdAt: 1000 },
    { id: "3", title: "Prior cycle utility", amount: 1200, date: "2026-08-25", category: "Utilities", notes: null, createdAt: 1000 },
    { id: "4", title: "Two months ago rent", amount: 25000, date: "2026-07-05", category: "Rent", notes: null, createdAt: 1000 },
  ];

  it("resolves current pay cycle start and end boundaries for salaryDay", () => {
    const refDate = new Date("2026-09-08T12:00:00Z");
    const { startStr, endStr } = resolvePayCycle(1, {}, refDate);
    expect(startStr).toBe("2026-09-01");
    expect(endStr).toBe("2026-09-30");
  });

  it("filters expenses by current pay period (salary)", () => {
    const refDate = new Date("2026-09-08T12:00:00Z");
    const { startStr, endStr } = resolvePayCycle(1, {}, refDate);

    const filtered = sampleExpenses.filter(
      (e) => e.date && e.date.slice(0, 10) >= startStr && e.date.slice(0, 10) <= endStr
    );

    expect(filtered.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("filters expenses by rolling 7 days cutoff", () => {
    const fixedNow = new Date("2026-09-08T12:00:00Z");
    const cutoff7 = toLocalDateStr(new Date(fixedNow.getTime() - 7 * 86400000));

    const filtered = sampleExpenses.filter((e) => e.date && e.date.slice(0, 10) >= cutoff7);
    expect(filtered.map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("filters expenses by rolling 30 days cutoff", () => {
    const fixedNow = new Date("2026-09-08T12:00:00Z");
    const cutoff30 = toLocalDateStr(new Date(fixedNow.getTime() - 30 * 86400000));

    const filtered = sampleExpenses.filter((e) => e.date && e.date.slice(0, 10) >= cutoff30);
    expect(filtered.map((e) => e.id)).toEqual(["1", "2", "3"]);
  });

  it("includes all transactions when timeFilter is all", () => {
    const filtered = [...sampleExpenses];
    expect(filtered.length).toBe(4);
  });
});
