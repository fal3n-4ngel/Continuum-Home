import React from "react";

interface ExpenseLedgerControlsProps {
  currency: string;
  expenseSearch: string;
  setExpenseSearch: (s: string) => void;
  ledgerCategoryFilter: string;
  setLedgerCategoryFilter: (s: string) => void;
  allCategories: string[];
  ledgerMinAmount: string;
  setLedgerMinAmount: (s: string) => void;
  ledgerMaxAmount: string;
  setLedgerMaxAmount: (s: string) => void;
  ledgerStartDate: string;
  setLedgerStartDate: (d: string) => void;
  ledgerEndDate: string;
  setLedgerEndDate: (d: string) => void;
  ledgerSortField: "date" | "amount" | "title" | "category";
  setLedgerSortField: (f: "date" | "amount" | "title" | "category") => void;
  ledgerSortDir: "asc" | "desc";
  setLedgerSortDir: (d: "asc" | "desc") => void;
}

const INPUT_CLASS = "rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";

export const ExpenseLedgerControls: React.FC<ExpenseLedgerControlsProps> = ({
  currency,
  expenseSearch,
  setExpenseSearch,
  ledgerCategoryFilter,
  setLedgerCategoryFilter,
  allCategories,
  ledgerMinAmount,
  setLedgerMinAmount,
  ledgerMaxAmount,
  setLedgerMaxAmount,
  ledgerStartDate,
  setLedgerStartDate,
  ledgerEndDate,
  setLedgerEndDate,
  ledgerSortField,
  setLedgerSortField,
  ledgerSortDir,
  setLedgerSortDir,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Search..."
        value={expenseSearch}
        onChange={(e) => setExpenseSearch(e.target.value)}
        className={`${INPUT_CLASS} w-[115px] shrink-0 px-2 py-1 text-[11px]`}
      />
      <select
        value={ledgerCategoryFilter}
        onChange={(e) => setLedgerCategoryFilter(e.target.value)}
        className={`${INPUT_CLASS} shrink-0 cursor-pointer px-2 py-1 text-[11px]`}
      >
        <option value="">All Categories</option>
        {allCategories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="date"
          lang="en-CA"
          value={ledgerStartDate}
          onChange={(e) => setLedgerStartDate(e.target.value)}
          title="From date"
          aria-label="From date"
          className={`${INPUT_CLASS} w-[124px] cursor-pointer px-1.5 py-1 text-[11px]`}
        />
        <span className="text-[11px] text-text-secondary">to</span>
        <input
          type="date"
          lang="en-CA"
          value={ledgerEndDate}
          onChange={(e) => setLedgerEndDate(e.target.value)}
          title="To date"
          aria-label="To date"
          className={`${INPUT_CLASS} w-[124px] cursor-pointer px-1.5 py-1 text-[11px]`}
        />
        {(ledgerStartDate || ledgerEndDate) && (
          <button
            type="button"
            onClick={() => {
              setLedgerStartDate("");
              setLedgerEndDate("");
            }}
            title="Clear date filter"
            aria-label="Clear date filter"
            className="cursor-pointer rounded-md border border-border-subtle bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary"
          >
            ✕
          </button>
        )}
      </div>
      <input
        type="number"
        placeholder={`Min (${currency})`}
        value={ledgerMinAmount}
        onChange={(e) => setLedgerMinAmount(e.target.value)}
        className={`${INPUT_CLASS} w-[84px] shrink-0 px-2 py-1 text-[11px]`}
      />
      <input
        type="number"
        placeholder={`Max (${currency})`}
        value={ledgerMaxAmount}
        onChange={(e) => setLedgerMaxAmount(e.target.value)}
        className={`${INPUT_CLASS} w-[84px] shrink-0 px-2 py-1 text-[11px]`}
      />
      <div className="flex items-center gap-1 shrink-0">
        <select
          value={ledgerSortField}
          onChange={(e) => setLedgerSortField(e.target.value as typeof ledgerSortField)}
          title="Sort by"
          className={`${INPUT_CLASS} cursor-pointer px-2 py-1 text-[11px]`}
        >
          <option value="date">Date</option>
          <option value="amount">Amount</option>
          <option value="title">Description</option>
          <option value="category">Category</option>
        </select>
        <button
          type="button"
          onClick={() => setLedgerSortDir(ledgerSortDir === "asc" ? "desc" : "asc")}
          title={ledgerSortDir === "asc" ? "Ascending — click for descending" : "Descending — click for ascending"}
          className="cursor-pointer rounded-md border border-border-subtle bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-primary transition-all duration-200 hover:bg-bg-primary"
        >
          {ledgerSortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>
    </div>
  );
};
