import { Expense } from "@/types";
import { toLocalDateStr } from "@/lib/utils/dates";

export interface ExpensePayCycleRange {
  startStr: string;
  endStr: string;
  prevStartStr?: string;
  prevEndStr?: string;
}

export interface BaseExpenseFilterOptions {
  timeFilter?: "7" | "30" | "90" | "salary" | "prev_salary" | "all";
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
  tag?: string;
  entryType?: "all" | "expense" | "income";
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
    } else if (timeFilter === "prev_salary" && currentPayCycle?.prevStartStr && currentPayCycle?.prevEndStr) {
      const { prevStartStr, prevEndStr } = currentPayCycle;
      list = list.filter((e) => e.date && e.date.slice(0, 10) >= prevStartStr && e.date.slice(0, 10) <= prevEndStr);
    } else if (timeFilter !== "salary" && timeFilter !== "prev_salary") {
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
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
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

  if (options.tag) {
    const tagLower = options.tag.toLowerCase();
    list = list.filter((e) => e.tags && e.tags.some((t) => t.toLowerCase() === tagLower));
  }

  if (options.entryType && options.entryType !== "all") {
    list = list.filter((e) => (e.type ?? "expense") === options.entryType);
  }

  return sortExpenses(list, options.sortField || "date", options.sortDir || "desc");
}

export function calculateExpenseTotals(expenses: Expense[]): {
  totalSpent: number;
  totalIncome: number;
  byCategory: Record<string, number>;
} {
  let totalSpent = 0;
  let totalIncome = 0;
  const byCategory: Record<string, number> = {};

  for (const e of expenses) {
    const amt = e.amount || 0;
    if (e.type === "income") {
      totalIncome += amt;
      continue;
    }
    totalSpent += amt;
    const cat = e.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + amt;
  }

  return { totalSpent, totalIncome, byCategory };
}

export interface DailyTrendOptions {
  timeFilter?: "7" | "30" | "90" | "salary" | "prev_salary" | "all";
  currentPayCycle?: ExpensePayCycleRange;
  referenceDate?: Date;
  startDate?: string;
  endDate?: string;
}

export function calculateDailyTrend(
  expenses: Expense[],
  options: DailyTrendOptions = {}
): [string, number][] {
  const {
    timeFilter = "all",
    currentPayCycle,
    referenceDate = new Date(),
    startDate,
    endDate,
  } = options;

  const expenseMap: Record<string, number> = {};
  expenses.forEach((e) => {
    if (e.type === "income") return;
    if (e.date) {
      const d = e.date.slice(0, 10);
      expenseMap[d] = (expenseMap[d] || 0) + (e.amount || 0);
    }
  });

  const refStr = toLocalDateStr(referenceDate);
  let rangeStart = "";
  let rangeEnd = refStr;

  if (startDate && endDate) {
    rangeStart = startDate;
    rangeEnd = endDate;
  } else if (timeFilter === "7") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 6);
    rangeStart = toLocalDateStr(d);
    rangeEnd = refStr;
  } else if (timeFilter === "30") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 29);
    rangeStart = toLocalDateStr(d);
    rangeEnd = refStr;
  } else if (timeFilter === "90") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 89);
    rangeStart = toLocalDateStr(d);
    rangeEnd = refStr;
  } else if (timeFilter === "salary" && currentPayCycle) {
    rangeStart = currentPayCycle.startStr;
    rangeEnd = currentPayCycle.endStr;
  } else if (timeFilter === "prev_salary" && currentPayCycle?.prevStartStr && currentPayCycle?.prevEndStr) {
    rangeStart = currentPayCycle.prevStartStr;
    rangeEnd = currentPayCycle.prevEndStr;
  } else {
    const allDates = Object.keys(expenseMap).sort();
    if (allDates.length === 0) return [];
    rangeStart = allDates[0];
    rangeEnd = allDates[allDates.length - 1];
  }

  if (rangeStart && rangeEnd && rangeStart <= rangeEnd) {
    const s = new Date(`${rangeStart}T00:00:00`);
    const e = new Date(`${rangeEnd}T00:00:00`);
    const diffDays = Math.round((e.getTime() - s.getTime()) / 86400000);

    if (diffDays >= 0 && diffDays <= 120) {
      const result: [string, number][] = [];
      const cur = new Date(s);
      while (cur <= e) {
        const dStr = toLocalDateStr(cur);
        result.push([dStr, Math.round((expenseMap[dStr] || 0) * 100) / 100]);
        cur.setDate(cur.getDate() + 1);
      }
      return result;
    }
  }

  return Object.entries(expenseMap).sort(([a], [b]) => a.localeCompare(b));
}
