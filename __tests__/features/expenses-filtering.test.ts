import { describe, it, expect } from "vitest";
import {
  filterExpensesBase,
  filterExpenses,
  sortExpenses,
  calculateExpenseTotals,
} from "@/features/expenses/lib/filtering";
import { Expense } from "@/types";

describe("features/expenses/lib/filtering real unit tests", () => {
  const sampleExpenses: Expense[] = [
    {
      id: "exp-1",
      title: "Specialty Espresso",
      amount: 250,
      date: "2026-09-10",
      category: "Food",
      notes: "Morning roast",
      createdAt: 1000,
    },
    {
      id: "exp-2",
      title: "Organic Grocery Bag",
      amount: 3200,
      date: "2026-09-05",
      category: "Food",
      notes: "Weekly staples",
      createdAt: 1001,
    },
    {
      id: "exp-3",
      title: "Broadband Internet",
      amount: 1499,
      date: "2026-09-01",
      category: "Utilities",
      notes: "Fibre connection",
      createdAt: 1002,
    },
    {
      id: "exp-4",
      title: "Metro Smartcard Recharge",
      amount: 500,
      date: "2026-08-25",
      category: "Transit",
      notes: "Commute card",
      createdAt: 1003,
    },
    {
      id: "exp-5",
      title: "Apartment Rent",
      amount: 30000,
      date: "2026-08-01",
      category: "Rent",
      notes: null,
      createdAt: 1004,
    },
    {
      id: "exp-6",
      title: "Noise Cancelling Headphones",
      amount: 18500,
      date: "2026-06-15",
      category: "Electronics",
      notes: "Work upgrade",
      createdAt: 1005,
    },
  ];

  const payCycleRange = {
    startStr: "2026-09-01",
    endStr: "2026-09-30",
  };

  const fixedRefDate = new Date("2026-09-10T12:00:00Z");

  it("filters expenses by pay cycle range including exact start and end dates", () => {
    const result = filterExpensesBase(sampleExpenses, {
      timeFilter: "salary",
      currentPayCycle: payCycleRange,
      referenceDate: fixedRefDate,
    });

    const ids = result.map((e) => e.id);
    expect(ids).toContain("exp-1");
    expect(ids).toContain("exp-2");
    expect(ids).toContain("exp-3");
    expect(ids).not.toContain("exp-4");
    expect(ids).not.toContain("exp-5");
    expect(result).toHaveLength(3);
  });

  it("filters expenses by rolling 7-day cutoff", () => {
    const result = filterExpensesBase(sampleExpenses, {
      timeFilter: "7",
      referenceDate: fixedRefDate,
    });

    const ids = result.map((e) => e.id);
    expect(ids).toEqual(["exp-1", "exp-2"]);
  });

  it("filters expenses by rolling 30-day cutoff", () => {
    const result = filterExpensesBase(sampleExpenses, {
      timeFilter: "30",
      referenceDate: fixedRefDate,
    });

    const ids = result.map((e) => e.id);
    expect(ids).toEqual(["exp-1", "exp-2", "exp-3", "exp-4"]);
    expect(ids).not.toContain("exp-5");
    expect(ids).not.toContain("exp-6");
  });

  it("returns all expenses when timeFilter is all", () => {
    const result = filterExpensesBase(sampleExpenses, {
      timeFilter: "all",
      referenceDate: fixedRefDate,
    });
    expect(result).toHaveLength(sampleExpenses.length);
  });

  it("searches expenses by title substring case-insensitively", () => {
    const result = filterExpensesBase(sampleExpenses, {
      search: "espresso",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("exp-1");
  });

  it("searches expenses by notes substring case-insensitively", () => {
    const result = filterExpensesBase(sampleExpenses, {
      search: "fibre",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("exp-3");
  });

  it("filters by minimum amount threshold", () => {
    const result = filterExpensesBase(sampleExpenses, {
      minAmount: "3200",
    });
    const ids = result.map((e) => e.id);
    expect(ids).toContain("exp-2");
    expect(ids).toContain("exp-5");
    expect(ids).toContain("exp-6");
    expect(ids).not.toContain("exp-1");
    expect(ids).not.toContain("exp-3");
  });

  it("filters by maximum amount threshold", () => {
    const result = filterExpensesBase(sampleExpenses, {
      maxAmount: 1000,
    });
    const ids = result.map((e) => e.id);
    expect(ids).toContain("exp-1");
    expect(ids).toContain("exp-4");
    expect(result).toHaveLength(2);
  });

  it("filters by custom date range", () => {
    const result = filterExpensesBase(sampleExpenses, {
      startDate: "2026-08-20",
      endDate: "2026-09-02",
    });
    const ids = result.map((e) => e.id);
    expect(ids).toEqual(["exp-3", "exp-4"]);
  });

  it("combines category filter and multiple criteria with filterExpenses", () => {
    const result = filterExpenses(sampleExpenses, {
      category: "Food",
      minAmount: 500,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("exp-2");
  });

  it("sorts expenses by amount ascending and descending", () => {
    const asc = sortExpenses(sampleExpenses, "amount", "asc");
    expect(asc[0].amount).toBe(250);
    expect(asc[asc.length - 1].amount).toBe(30000);

    const desc = sortExpenses(sampleExpenses, "amount", "desc");
    expect(desc[0].amount).toBe(30000);
    expect(desc[desc.length - 1].amount).toBe(250);
  });

  it("sorts expenses alphabetically by title", () => {
    const sorted = sortExpenses(sampleExpenses, "title", "asc");
    expect(sorted[0].title).toBe("Apartment Rent");
    expect(sorted[sorted.length - 1].title).toBe("Specialty Espresso");
  });

  it("calculates accurate total spent and category breakdown", () => {
    const totals = calculateExpenseTotals(sampleExpenses);
    expect(totals.totalSpent).toBe(250 + 3200 + 1499 + 500 + 30000 + 18500);
    expect(totals.byCategory["Food"]).toBe(3450);
    expect(totals.byCategory["Utilities"]).toBe(1499);
    expect(totals.byCategory["Transit"]).toBe(500);
    expect(totals.byCategory["Rent"]).toBe(30000);
    expect(totals.byCategory["Electronics"]).toBe(18500);
  });
});
