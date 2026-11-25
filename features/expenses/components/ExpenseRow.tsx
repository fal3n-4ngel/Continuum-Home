import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Expense } from "@/types";

interface ExpenseRowProps {
  exp: Expense;
  currency: string;
  deleteExpense: (id: string) => void;
  onEditExpense?: (exp: Expense) => void;
}

const LEDGER_TD = "border-b border-border-subtle px-3 py-3 align-middle text-[13px] text-text-primary";

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ exp, currency, deleteExpense, onEditExpense }) => {
  const isIncome = exp.type === "income";
  return (
    <tr className="group transition-colors hover:bg-bg-secondary/60">
      <td className={`${LEDGER_TD} font-medium`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>{exp.title}</span>
          {isIncome && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-600">
              Income
            </span>
          )}
          {exp.tags && exp.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border-subtle bg-bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
              #{tag}
            </span>
          ))}
        </div>
        {exp.notes && <p className="mt-0.5 text-[10px] text-text-muted">{exp.notes}</p>}
        {exp.splits && exp.splits.length > 0 && (
          <p className="mt-0.5 text-[10px] text-text-secondary">
            Split ({exp.splits.length}): {exp.splits.map((s) => `${s.label} ${currency}${s.amount}`).join(" · ")}
          </p>
        )}
      </td>
      <td className={LEDGER_TD}>
        {exp.category ? (
          <span className="rounded bg-bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-text-secondary border border-border-subtle">
            {exp.category}
          </span>
        ) : "—"}
      </td>
      <td className={`${LEDGER_TD} text-[11px] text-text-secondary`}>{exp.date || "—"}</td>
      <td className={`${LEDGER_TD} text-right font-semibold ${isIncome ? "text-emerald-600" : ""}`}>
        {isIncome ? "+" : ""}{currency}{(exp.amount || 0).toLocaleString()}
      </td>
      <td className={`${LEDGER_TD} text-right`}>
        <div className="flex items-center justify-end gap-1">
          {onEditExpense && (
            <button
              type="button"
              onClick={() => onEditExpense(exp)}
              title="Edit expense"
              className="cursor-pointer rounded-md p-1.5 text-text-muted hover:bg-bg-card hover:text-text-primary hover:shadow-xs transition-all active:scale-95"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteExpense(exp.id)}
            title="Delete expense"
            className="cursor-pointer rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-600 transition-all active:scale-95"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};
