"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, X, Loader2, Plus, Trash2 } from "lucide-react";
import { Expense, ExpenseSplit, ExpenseType } from "@/types";

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  currency: string;
  allCategories: string[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Expense>) => Promise<void>;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  currency,
  allCategories,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [entryType, setEntryType] = useState<ExpenseType>("expense");
  const [tagsInput, setTagsInput] = useState("");
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (expense) {
      setTitle(expense.title || "");
      setAmount(expense.amount ? String(expense.amount) : "");
      setCategory(expense.category || "");
      setDate(expense.date || "");
      setNotes(expense.notes || "");
      setEntryType(expense.type === "income" ? "income" : "expense");
      setTagsInput(expense.tags?.join(", ") || "");
      setSplits(expense.splits || []);
      setErrorMessage("");
    }
  }, [expense]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const parseTags = (raw: string): string[] =>
    raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expense) return;
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid title and positive amount.");
      return;
    }

    const cleanSplits = splits
      .filter((s) => s.label.trim() && Number.isFinite(s.amount) && s.amount >= 0)
      .map((s) => ({ label: s.label.trim(), amount: s.amount, ...(s.category ? { category: s.category } : {}) }));

    try {
      setIsSaving(true);
      setErrorMessage("");
      await onSave(expense.id, {
        title: title.trim(),
        amount: parsedAmount,
        category: category || "Other",
        date: date || undefined,
        notes: notes.trim() || undefined,
        type: entryType,
        tags: parseTags(tagsInput),
        splits: cleanSplits,
      });
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save changes. Please try again.");
      setIsSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && expense && (
        <motion.div
          key="edit-expense-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="edit-expense-card"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", bounce: 0, duration: 0.28 }}
            className="m-3 sm:m-4 flex max-h-[90vh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-card border border-border-subtle bg-bg-card p-4 sm:p-6 shadow-subtle"
            onClick={(e) => e.stopPropagation()}
          >

        <div className="flex items-center justify-between border-b border-border-subtle pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-primary text-text-primary">
              <Pencil size={15} />
            </div>
            <h3 className="text-[15px] font-bold text-text-primary">Edit Expense Item</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-muted">Description / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner with friends"
              className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Date</label>
              <input
                type="date"
                lang="en-CA"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Entry Type</label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as ExpenseType)}
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              >
                <option value="expense">Expense</option>
                <option value="income">Income / Salary</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-text-muted">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. dining, work"
                className="w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium text-text-muted">Splits (Optional)</label>
              <button
                type="button"
                onClick={() => setSplits([...splits, { label: "", amount: 0 }])}
                className="flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <Plus size={12} /> Add Split
              </button>
            </div>
            {splits.length > 0 && (
              <div className="flex flex-col gap-2">
                {splits.map((split, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={split.label}
                      onChange={(e) =>
                        setSplits(splits.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s)))
                      }
                      placeholder="Label (e.g. Friend / Tax)"
                      className="flex-1 rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-[12px] text-text-primary outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={split.amount}
                      onChange={(e) =>
                        setSplits(
                          splits.map((s, i) => (i === idx ? { ...s, amount: parseFloat(e.target.value) || 0 } : s))
                        )
                      }
                      className="w-24 rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-[12px] text-text-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                      className="rounded p-1 text-text-muted hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="text-[11.5px] font-medium text-red-600">{errorMessage}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border-subtle pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border border-border-subtle bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary hover:bg-bg-primary transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-text-primary px-4 py-2 text-[13px] font-semibold text-bg-primary shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
