"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, X, Loader2 } from "lucide-react";
import { Expense } from "@/types";

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
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (expense) {
      setTitle(expense.title || "");
      setAmount(expense.amount ? String(expense.amount) : "");
      setCategory(expense.category || "");
      setDate(expense.date || "");
      setNotes(expense.notes || "");
      setErrorMessage("");
    }
  }, [expense]);

  if (!isOpen || !expense || typeof window === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid title and positive amount.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      await onSave(expense.id, {
        title: title.trim(),
        amount: parsedAmount,
        category: category || "Other",
        date: date || undefined,
        notes: notes.trim() || undefined,
      });
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save changes. Please try again.");
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      <div
        className="m-4 flex w-full max-w-[440px] flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle animate-[fadeInScale_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        
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
              className="flex items-center gap-1.5 rounded-lg bg-text-primary px-4 py-2 text-[13px] font-semibold text-white shadow-xs hover:bg-[#2e2d27] transition-all cursor-pointer disabled:opacity-50"
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
      </div>
    </div>,
    document.body
  );
};
