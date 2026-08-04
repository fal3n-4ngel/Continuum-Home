import React from "react";
import { Expense } from "@/types";

interface ExpenseRowProps {
  exp: Expense;
  currency: string;
  deleteExpense: (id: string) => void;
}

const LEDGER_TD = "border-b border-border-subtle px-3 py-3 align-middle text-[13px] text-text-primary";

export const ExpenseRow: React.FC<ExpenseRowProps> = ({ exp, currency, deleteExpense }) => {
  return (
    <tr className="hover:bg-bg-secondary">
      <td className={`${LEDGER_TD} font-medium`}>
        {exp.title}
        {exp.notes && <p className="mt-0.5 text-[10px] text-text-muted">{exp.notes}</p>}
      </td>
      <td className={LEDGER_TD}>
        {exp.category ? (
          <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase">
            {exp.category}
          </span>
        ) : "—"}
      </td>
      <td className={`${LEDGER_TD} text-[11px] text-text-secondary`}>{exp.date || "—"}</td>
      <td className={`${LEDGER_TD} text-right font-semibold`}>{currency}{(exp.amount || 0).toLocaleString()}</td>
      <td className={`${LEDGER_TD} text-right`}>
        <button
          onClick={() => deleteExpense(exp.id)}
          className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 text-[11px] text-[#b3666b]"
        >
          delete
        </button>
      </td>
    </tr>
  );
};
