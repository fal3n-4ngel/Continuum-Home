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
  return (
    <tr className="group transition-colors hover:bg-bg-secondary/60">
      <td className={`${LEDGER_TD} font-medium`}>
        {exp.title}
        {exp.notes && <p className="mt-0.5 text-[10px] text-text-muted">{exp.notes}</p>}
      </td>
      <td className={LEDGER_TD}>
        {exp.category ? (
          <span className="rounded bg-bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-text-secondary border border-border-subtle">
            {exp.category}
          </span>
        ) : "—"}
      </td>
      <td className={`${LEDGER_TD} text-[11px] text-text-secondary`}>{exp.date || "—"}</td>
      <td className={`${LEDGER_TD} text-right font-semibold`}>{currency}{(exp.amount || 0).toLocaleString()}</td>
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
