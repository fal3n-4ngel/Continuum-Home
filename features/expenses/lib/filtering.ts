import { Expense } from "@/types";
import { toLocalDateStr } from "@/lib/utils/dates";

export interface ExpensePayCycleRange {
  startStr: string;
  endStr: string;
}

export interface BaseExpenseFilterOptions {
  timeFilter?: "7" | "30" | "90" | "salary" | "all";
  currentPayCycle?: ExpensePayCycleRange;
  search?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
  startDate?: string;
  endDate?: string;
  referenceDate?: Date;
}

export interface FullExpenseFilterOptions extends BaseExpenseFilterOptions {
  category?: string;
  sortField?: "date" | "amount" | "title" | "category";
  sortDir?: "asc" | "desc";
}

export function filterExpensesBase(expenses: Expense[], options: BaseExpenseFilterOptions = {}): Expense[] {
  let list = [...expenses];
  const {
    timeFilter = "all",
    currentPayCycle,
    search,
    minAmount,
    maxAmount,
    startDate,
    endDate,
    referenceDate = new Date(),
  } = options;

  if (timeFilter !== "all") {
    if (timeFilter === "salary" && currentPayCycle) {
      const { startStr, endStr } = currentPayCycle;
      list = list.filter((e) => e.date && e.date.slice(0, 10) >= startStr && e.date.slice(0, 10) <= endStr);
    } else if (timeFilter !== "salary") {
      const days = parseInt(timeFilter, 10);
      if (!isNaN(days)) {
        const cutoff = toLocalDateStr(new Date(referenceDate.getTime() - days * 86400000));
        list = list.filter((e) => e.date && e.date.slice(0, 10) >= cutoff);
      }
    }
  }

  if (search) {
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q))
      );
    }
  }

  if (minAmount !== undefined && minAmount !== "") {
    const min = typeof minAmount === "number" ? minAmount : parseFloat(minAmount);
    if (!isNaN(min)) {
      list = list.filter((e) => (e.amount || 0) >= min);
    }
  }

  if (maxAmount !== undefined && maxAmount !== "") {
    const max = typeof maxAmount === "number" ? maxAmount : parseFloat(maxAmount);
    if (!isNaN(max)) {
      list = list.filter((e) => (e.amount || 0) <= max);
    }
  }

  if (startDate) {
    list = list.filter((e) => e.date && e.date.slice(0, 10) >= startDate);
  }

  if (endDate) {
    list = list.filter((e) => e.date && e.date.slice(0, 10) <= endDate);
  }

  return list;
}

export function sortExpenses(
  expenses: Expense[],
  sortField: "date" | "amount" | "title" | "category" = "date",
  sortDir: "asc" | "desc" = "desc"
): Expense[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...expenses].sort((a, b) => {
    switch (sortField) {
      case "amount":
        return ((a.amount || 0) - (b.amount || 0)) * dir;
      case "title":
        return (a.title || "").localeCompare(b.title || "") * dir;
      case "category":
        return (a.category || "").localeCompare(b.category || "") * dir;
      case "date":
      default:
        return (a.date || "").localeCompare(b.date || "") * dir;
    }
  });
}

export function filterExpenses(expenses: Expense[], options: FullExpenseFilterOptions = {}): Expense[] {
  let list = filterExpensesBase(expenses, options);

  if (options.category) {
    list = list.filter((e) => e.category === options.category);
  }

  return sortExpenses(list, options.sortField || "date", options.sortDir || "desc");
}

export function calculateExpenseTotals(expenses: Expense[]): {
  totalSpent: number;
  byCategory: Record<string, number>;
} {
  let totalSpent = 0;
  const byCategory: Record<string, number> = {};

  for (const e of expenses) {
    const amt = e.amount || 0;
    totalSpent += amt;
    const cat = e.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + amt;
  }

  return { totalSpent, byCategory };
}
