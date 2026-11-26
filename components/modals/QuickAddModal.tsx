"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  categories: string[];
  getHeaders: () => Record<string, string>;
  onCreated: () => void;
  onNavigateTab: (tab: string) => void;
  showInvestmentsTab: boolean;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  currency,
  categories,
  getHeaders,
  onCreated,
  onNavigateTab,
  showInvestmentsTab,
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (typeof window === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!title.trim() || isNaN(parsed) || parsed <= 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: title.trim(),
          amount: parsed,
          category: category || null,
          date: toLocalDateStr(new Date()),
          type: entryType,
        }),
      });
      if (res.ok) {
        setTitle("");
        setAmount("");
        setCategory("");
        setEntryType("expense");
        onCreated();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const navTargets = [
    { id: "expenses", label: "Expenses & Subs" },
    { id: "financial", label: "Financial Health" },
    ...(showInvestmentsTab ? [{ id: "investments", label: "Investments" }] : []),
    { id: "media", label: "Library" },
    { id: "reports", label: "Reports" },
    { id: "agent", label: "AI Agent" },
    { id: "settings", label: "Settings" },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="quick-add-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/45 px-3 pt-[8vh] sm:pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="quick-add-card"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ type: "spring", bounce: 0, duration: 0.25 }}
            className="flex max-h-[84vh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-card border border-border-subtle bg-bg-card p-4 sm:p-5 shadow-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Plus size={15} className="text-accent-terracotta" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-text-primary">
                  Quick Log &amp; Jump
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md p-1 text-text-muted hover:bg-bg-primary hover:text-text-primary active:scale-[0.95] transition-transform duration-100"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-bg-secondary p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntryType(t)}
                    className={`cursor-pointer rounded-md py-1 text-xs font-semibold capitalize transition-all ${
                      entryType === t
                        ? "bg-bg-card text-text-primary shadow-xs"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_110px] gap-2">
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Description (e.g. Coffee)"
                  required
                  className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-hover"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${currency}0`}
                  required
                  className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-hover"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-hover"
                >
                  <option value="">Category (Optional)</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-text-primary px-4 py-2 text-xs font-semibold text-bg-primary transition-transform duration-100 ease-out hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Log"}
                </button>
              </div>
            </form>

            <div className="border-t border-border-subtle pt-3">
              <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Jump to Section
              </span>
              <div className="flex flex-wrap gap-1.5">
                {navTargets.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigateTab(item.id);
                      onClose();
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md border border-border-subtle bg-bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-all duration-100 hover:border-border-hover hover:text-text-primary active:scale-[0.97]"
                  >
                    <span>{item.label}</span>
                    <ArrowRight size={10} />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
