import { create } from 'zustand';
import { Expense, Subscription } from "@/types";

interface ExpensesState {
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  isFetchingExpenses: boolean;
  setIsFetchingExpenses: (is: boolean) => void;
  expensesLoaded: boolean;
  setExpensesLoaded: (loaded: boolean) => void;

  timeFilter: "7" | "30" | "90" | "salary" | "all";
  setTimeFilter: (f: "7" | "30" | "90" | "salary" | "all") => void;
  salaryDay: number;
  setSalaryDay: (d: number) => void;

  expenseTitle: string;
  setExpenseTitle: (s: string) => void;
  expenseAmount: string;
  setExpenseAmount: (s: string) => void;
  expenseCategory: string;
  setExpenseCategory: (s: string) => void;
  newCategoryInput: string;
  setNewCategoryInput: (s: string) => void;
  customCategories: string[];
  setCustomCategories: (cats: string[]) => void;
  expenseDate: string;
  setExpenseDate: (s: string) => void;
  expenseNotes: string;
  setExpenseNotes: (s: string) => void;
  isAddingExpense: boolean;
  setIsAddingExpense: (is: boolean) => void;

  expenseSearch: string;
  setExpenseSearch: (s: string) => void;
  ledgerCategoryFilter: string;
  setLedgerCategoryFilter: (s: string) => void;
  ledgerMinAmount: string;
  setLedgerMinAmount: (s: string) => void;
  ledgerMaxAmount: string;
  setLedgerMaxAmount: (s: string) => void;
  ledgerSortField: "date" | "amount" | "title" | "category";
  setLedgerSortField: (f: "date" | "amount" | "title" | "category") => void;
  ledgerSortDir: "asc" | "desc";
  setLedgerSortDir: (d: "asc" | "desc") => void;

  subscriptions: Subscription[];
  setSubscriptions: (subs: Subscription[]) => void;

  payCycle: any;
  setPayCycle: (p: any) => void;
  catBreakdown: Record<string, number>;
  setCatBreakdown: (c: Record<string, number>) => void;
  cycleHistoryRaw: any[];
  setCycleHistoryRaw: (c: any[]) => void;
}

export const useExpensesStore = create<ExpensesState>((set) => ({
  expenses: [],
  setExpenses: (expenses) => set({ expenses }),
  isFetchingExpenses: false,
  setIsFetchingExpenses: (is) => set({ isFetchingExpenses: is }),
  expensesLoaded: false,
  setExpensesLoaded: (loaded) => set({ expensesLoaded: loaded }),

  timeFilter: "all",
  setTimeFilter: (timeFilter) => {
    if (typeof window !== "undefined") window.localStorage.setItem("phub_time_filter", timeFilter);
    set({ timeFilter });
  },
  salaryDay: 1,
  setSalaryDay: (salaryDay) => {
    set({ salaryDay });
  },

  expenseTitle: "",
  setExpenseTitle: (expenseTitle) => set({ expenseTitle }),
  expenseAmount: "",
  setExpenseAmount: (expenseAmount) => set({ expenseAmount }),
  expenseCategory: "",
  setExpenseCategory: (expenseCategory) => set({ expenseCategory }),
  newCategoryInput: "",
  setNewCategoryInput: (newCategoryInput) => set({ newCategoryInput }),
  customCategories: [],
  setCustomCategories: (customCategories) => set({ customCategories }),
  expenseDate: "",
  setExpenseDate: (expenseDate) => set({ expenseDate }),
  expenseNotes: "",
  setExpenseNotes: (expenseNotes) => set({ expenseNotes }),
  isAddingExpense: false,
  setIsAddingExpense: (isAddingExpense) => set({ isAddingExpense }),

  expenseSearch: "",
  setExpenseSearch: (expenseSearch) => set({ expenseSearch }),
  ledgerCategoryFilter: "",
  setLedgerCategoryFilter: (ledgerCategoryFilter) => set({ ledgerCategoryFilter }),
  ledgerMinAmount: "",
  setLedgerMinAmount: (ledgerMinAmount) => set({ ledgerMinAmount }),
  ledgerMaxAmount: "",
  setLedgerMaxAmount: (ledgerMaxAmount) => set({ ledgerMaxAmount }),
  ledgerSortField: "date",
  setLedgerSortField: (ledgerSortField) => set({ ledgerSortField }),
  ledgerSortDir: "desc",
  setLedgerSortDir: (ledgerSortDir) => set({ ledgerSortDir }),

  subscriptions: [],
  setSubscriptions: (subscriptions) => set({ subscriptions }),

  payCycle: { startStr: "", endStr: "", subMonthlyCost: 0 },
  setPayCycle: (payCycle) => set({ payCycle }),
  catBreakdown: {},
  setCatBreakdown: (catBreakdown) => set({ catBreakdown }),
  cycleHistoryRaw: [],
  setCycleHistoryRaw: (cycleHistoryRaw) => set({ cycleHistoryRaw }),
}));
