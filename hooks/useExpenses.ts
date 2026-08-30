"use client";

import { useState, useMemo, useCallback } from "react";
import type { ExpenseRecord } from "@/lib/firebase";

export interface UseExpensesOptions {
  initialExpenses?: ExpenseRecord[];
}

export function useExpenses(initialExpenses: ExpenseRecord[] = []) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const exp of expenses) {
      if (exp.category) set.add(exp.category);
    }
    return Array.from(set).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        !searchQuery ||
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.category && exp.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || exp.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  const addExpenseLocally = useCallback((newRecord: ExpenseRecord) => {
    setExpenses((prev) => [newRecord, ...prev]);
  }, []);

  const removeExpenseLocally = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  }, []);

  return {
    expenses,
    setExpenses,
    filteredExpenses,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    totalAmount,
    addExpenseLocally,
    removeExpenseLocally,
  };
}
