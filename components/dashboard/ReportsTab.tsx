import React, { useMemo, useState } from "react";
import { Expense, WatchlistItem, MediaStatus, MediaType, InvestmentAsset, InvestmentCategory } from "@/types";
import { downloadCsv } from "@/lib/csv";
import { resolvePayCycle, toLocalDateStr } from "@/lib/dates";
import { getEffectiveAmount } from "@/lib/fd";
import {
  TrendingUp,
  DollarSign,
  Film,
  Tv,
  Sparkles,
  BookOpen,
  Calendar,
  FileText,
  Clock,
  ScanSearch
} from "lucide-react";

interface SalaryLogEntry {
  date: string;
  amount: number;
}

// Mirrors the shape of app/page.tsx's `cycleHistory` (past COMPLETE pay
// cycles, newest first) — passed straight through rather than recomputed
// here, since building it requires salary log + subscriptions + multi-cycle
// baselining logic that already lives in one place.
interface CycleHistoryEntry {
  startStr: string;
  endStr: string;
  income: number;
  spend: number;
}

interface ReportsTabProps {
  expenses: Expense[];
  watchlist: WatchlistItem[];
  investments: InvestmentAsset[];
  currency: string;
  salaryDay: number;
  salaryLog: Record<string, SalaryLogEntry>;
  isProUser: boolean;
  cycleHistory: CycleHistoryEntry[];
  reconciliations: Record<string, number>;
}

const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const CARD_HEADER = "flex items-center justify-between gap-2 border-b border-border-subtle bg-bg-primary/30 px-5 py-3.5";
const CARD_BODY = "flex flex-col gap-3 p-5";
const LABEL_MONO = "font-mono text-[10px] font-bold tracking-[0.8px] text-text-secondary uppercase";
const INPUT_CLASS = "w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";
const BTN_PRIMARY = "cursor-pointer rounded-full border border-text-primary bg-text-primary px-4 py-2 text-[12px] font-semibold text-white transition-all duration-150 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]";
const PILL = "cursor-pointer rounded-md border border-border-subtle bg-bg-card px-2.5 py-1 text-[10.5px] font-medium text-text-secondary transition-all duration-150 hover:border-border-hover hover:text-text-primary";
const LEDGER_TH = "border-b border-border-subtle px-3 py-2 text-left font-mono text-[9.5px] font-bold tracking-[0.4px] text-text-secondary uppercase";
const LEDGER_TD = "border-b border-border-subtle px-3 py-2.5 text-[11px] text-text-primary align-middle";

const todayStamp = () => toLocalDateStr(new Date());

const fmtShort = (s: string) => {
  const d = new Date(`${s}T00:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
};

function buildCyclePresets(salaryDay: number, salaryLog: Record<string, SalaryLogEntry>) {
  const cycles: { startStr: string; endStr: string }[] = [];
  let refDate = new Date();
  for (let i = 0; i < 6; i++) {
    const c = resolvePayCycle(salaryDay, salaryLog, refDate);
    cycles.push({ startStr: c.startStr, endStr: c.endStr });
    refDate = new Date(`${c.prevEndStr}T00:00:00`);
  }
  return cycles;
}

const ReportCardHeader: React.FC<{ title: string; icon: React.ReactNode; count: number; noun: string }> = ({ title, icon, count, noun }) => (
  <div className={CARD_HEADER}>
    <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-tight text-text-primary">
      {icon} {title}
    </h2>
    <span className="rounded bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.4px] text-text-secondary uppercase">
      {count} {noun}{count === 1 ? "" : "s"}
    </span>
  </div>
);

/* ─── EXPENSES REPORT CARD ─── */
const ExpenseReportCard: React.FC<{ expenses: Expense[]; currency: string; salaryDay: number; salaryLog: Record<string, SalaryLogEntry> }> = ({
  expenses,
  currency,
  salaryDay,
  salaryLog,
}) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const cyclePresets = useMemo(() => buildCyclePresets(salaryDay, salaryLog), [salaryDay, salaryLog]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (dateFrom && (!e.date || e.date < dateFrom)) return false;
        if (dateTo && (!e.date || e.date > dateTo)) return false;
        if (category && e.category !== category) return false;
        const min = parseFloat(minAmount);
        if (!isNaN(min) && (e.amount || 0) < min) return false;
        const max = parseFloat(maxAmount);
        if (!isNaN(max) && (e.amount || 0) > max) return false;
        return true;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [expenses, dateFrom, dateTo, category, minAmount, maxAmount]);

  const total = filtered.reduce((acc, e) => acc + (e.amount || 0), 0);

  const applyPreset = (n: 1 | 2 | 3 | 6) => {
    setDateFrom(cyclePresets[n - 1] ? cyclePresets[n - 1].startStr : "");
    setDateTo(cyclePresets[0].endStr);
  };

  const download = () => {
    downloadCsv(
      `expenses_report_${todayStamp()}.csv`,
      ["Date", "Title", "Category", "Amount", "Notes"],
      filtered.map((e) => [e.date || "", e.title, e.category || "", e.amount ?? "", e.notes || ""])
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title="Expenses Ledger" icon={<DollarSign className="h-4.5 w-4.5 text-text-secondary" />} count={filtered.length} noun="entry" />
      <div className={CARD_BODY}>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => applyPreset(1)} className={PILL}>This cycle</button>
          <button onClick={() => applyPreset(2)} className={PILL}>Last cycle</button>
          <button onClick={() => applyPreset(3)} className={PILL}>3 cycles</button>
          <button onClick={() => applyPreset(6)} className={PILL}>6 cycles</button>
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className={PILL}>All time</button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Min Value ({currency})</label>
            <input type="number" min="0" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Max Value ({currency})</label>
            <input type="number" min="0" placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary/10">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={LEDGER_TH}>Date</th>
                  <th className={LEDGER_TH}>Title</th>
                  <th className={`${LEDGER_TH} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 4).map((e) => (
                  <tr key={e.id} className="hover:bg-bg-secondary/40">
                    <td className={`${LEDGER_TD} font-mono whitespace-nowrap`}>{e.date ? fmtShort(e.date) : "—"}</td>
                    <td className={`${LEDGER_TD} max-w-[130px] truncate font-medium`}>{e.title}</td>
                    <td className={`${LEDGER_TD} text-right font-mono font-bold`}>{currency}{(e.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 4 && (
              <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] font-semibold text-text-muted">
                +{filtered.length - 4} more in full export
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="text-[11px] text-text-secondary">
            Filtered Total: <strong className="text-text-primary font-bold font-mono">{currency}{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
          </span>
          <button onClick={download} disabled={filtered.length === 0} className={BTN_PRIMARY}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── INVESTMENTS REPORT CARD ─── */
const InvestmentReportCard: React.FC<{ investments: InvestmentAsset[]; currency: string }> = ({
  investments,
  currency,
}) => {
  const [category, setCategory] = useState<InvestmentCategory | "">("");
  const [status, setStatus] = useState<"all" | "active" | "sold">("all");
  const [minValuation, setMinValuation] = useState("");
  const [maxValuation, setMaxValuation] = useState("");

  const categoryLabels: Record<InvestmentCategory, string> = {
    equity: "Stocks / Equity",
    crypto: "Cryptocurrency",
    mutual_fund: "Mutual Funds",
    sip: "SIP (Recurring MF)",
    gold: "Gold / Precious Metals",
    cash: "Cash / Savings",
    fixed_deposit: "Fixed Deposit (FD)",
    other: "Other Assets",
  };

  const filtered = useMemo(() => {
    return investments
      .filter((i) => {
        if (category && i.category !== category) return false;
        if (status === "active" && i.isSold) return false;
        if (status === "sold" && !i.isSold) return false;
        
        const val = getEffectiveAmount(i);
        const minVal = parseFloat(minValuation);
        if (!isNaN(minVal) && val < minVal) return false;
        const maxVal = parseFloat(maxValuation);
        if (!isNaN(maxVal) && val > maxVal) return false;

        return true;
      })
      .sort((a, b) => getEffectiveAmount(b) - getEffectiveAmount(a));
  }, [investments, category, status, minValuation, maxValuation]);

  const download = () => {
    downloadCsv(
      `investments_report_${todayStamp()}.csv`,
      ["Asset Name", "Category", "Quantity Owned", "Avg Buy Price", "Current Valuation", "Invested Capital", "Unrealized P&L", "Status", "Sold Price", "Date Sold"],
      filtered.map((i) => {
        const valuation = getEffectiveAmount(i);
        const cost = i.investedAmount || i.amount || 0;
        const pnl = valuation - cost;
        const statusStr = i.isSold ? "Sold" : "Active";
        const dateSoldStr = i.soldAt ? toLocalDateStr(new Date(i.soldAt)) : "—";
        return [
          i.name,
          i.category,
          i.quantity ?? "",
          i.buyPrice ?? "",
          valuation,
          cost,
          pnl,
          statusStr,
          i.soldPrice ?? "",
          dateSoldStr
        ];
      })
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title="Portfolio Assets" icon={<TrendingUp className="h-4.5 w-4.5 text-text-secondary" />} count={filtered.length} noun="asset" />
      <div className={CARD_BODY}>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
              <option value="">All Categories</option>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
              <option value="all">All (Active & Sold)</option>
              <option value="active">Active Holdings Only</option>
              <option value="sold">Sold History Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Min Val ({currency})</label>
            <input type="number" min="0" placeholder="0" value={minValuation} onChange={(e) => setMinValuation(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Max Val ({currency})</label>
            <input type="number" min="0" placeholder="Any" value={maxValuation} onChange={(e) => setMaxValuation(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary/10">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={LEDGER_TH}>Asset</th>
                  <th className={`${LEDGER_TH} text-right`}>Market Value</th>
                  <th className={`${LEDGER_TH} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 4).map((i) => (
                  <tr key={i.id} className="hover:bg-bg-secondary/40">
                    <td className={`${LEDGER_TD} font-semibold truncate max-w-[130px]`}>{i.name}</td>
                    <td className={`${LEDGER_TD} text-right font-mono font-bold`}>
                      {i.isSold ? (
                        <span className="text-[#16a34a] font-bold">Sold @ {currency}{i.soldPrice?.toLocaleString()}</span>
                      ) : (
                        <span>{currency}{getEffectiveAmount(i).toLocaleString()}</span>
                      )}
                    </td>
                    <td className={`${LEDGER_TD} text-right`}>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                        i.isSold ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {i.isSold ? "Sold" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 4 && (
              <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] font-semibold text-text-muted">
                +{filtered.length - 4} more in full export
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end border-t border-border-subtle pt-3">
          <button onClick={download} disabled={filtered.length === 0} className={BTN_PRIMARY}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── MONTHLY DISCREPANCY REPORT (Pro) ─── */
// How closely each reconciled pay cycle's confirmed "actual amount left"
// matched what the ledger predicted — the audit trail behind Financial
// Health's "Does This Match Reality?" check, across all history rather than
// just the last few cycles shown there.
const DiscrepancyReportCard: React.FC<{
  cycleHistory: CycleHistoryEntry[];
  reconciliations: Record<string, number>;
  currency: string;
}> = ({ cycleHistory, reconciliations, currency }) => {
  const rows = useMemo(() => {
    return cycleHistory
      .filter((c) => reconciliations[c.startStr] !== undefined)
      .map((c) => {
        const expected = c.income - c.spend;
        const actual = reconciliations[c.startStr];
        const threshold = Math.max(50, c.income * 0.01);
        const discrepancy = expected - actual;
        const status: "accurate" | "short" | "extra" =
          Math.abs(discrepancy) <= threshold ? "accurate" : discrepancy > 0 ? "short" : "extra";
        return { startStr: c.startStr, endStr: c.endStr, expected, actual, discrepancy, status };
      })
      .sort((a, b) => b.startStr.localeCompare(a.startStr));
  }, [cycleHistory, reconciliations]);

  const totalUnaccounted = rows.filter((r) => r.status === "short").reduce((acc, r) => acc + r.discrepancy, 0);
  const accurateCount = rows.filter((r) => r.status === "accurate").length;

  const download = () => {
    downloadCsv(
      `discrepancy_report_${todayStamp()}.csv`,
      ["Cycle Start", "Cycle End", "Expected Cash On Hand", "Confirmed Actual", "Discrepancy", "Status"],
      rows.map((r) => [
        r.startStr,
        r.endStr,
        r.expected,
        r.actual,
        r.discrepancy,
        r.status === "accurate" ? "Accurate" : r.status === "short" ? "Unaccounted (Short)" : "Extra",
      ])
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title="Monthly Discrepancy Report" icon={<ScanSearch className="h-4.5 w-4.5 text-text-secondary" />} count={rows.length} noun="cycle" />
      <div className={CARD_BODY}>
        <p className="text-[11px] leading-relaxed text-text-secondary">
          Every reconciled pay cycle's confirmed cash-on-hand vs. what the ledger predicted — the full audit trail behind Financial Health&apos;s reality check.
        </p>

        {rows.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-text-muted">
            No reconciled cycles yet — confirm &quot;Does This Match Reality?&quot; on the Financial Health tab each cycle to build this report.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border-subtle bg-bg-secondary/10 p-3">
              <div>
                <span className="block font-mono text-[9px] font-bold tracking-[0.4px] text-text-muted uppercase">Total Unaccounted</span>
                <span className="text-[15px] font-bold text-rose-700">{currency}{totalUnaccounted.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
              <div>
                <span className="block font-mono text-[9px] font-bold tracking-[0.4px] text-text-muted uppercase">Accurate Cycles</span>
                <span className="text-[15px] font-bold text-text-primary">{accurateCount} / {rows.length}</span>
              </div>
            </div>

            <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary/10">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={LEDGER_TH}>Cycle</th>
                    <th className={`${LEDGER_TH} text-right`}>Discrepancy</th>
                    <th className={`${LEDGER_TH} text-right`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 6).map((r) => (
                    <tr key={r.startStr} className="hover:bg-bg-secondary/40">
                      <td className={`${LEDGER_TD} whitespace-nowrap`}>{fmtShort(r.startStr)} – {fmtShort(r.endStr)}</td>
                      <td className={`${LEDGER_TD} text-right font-mono font-bold`}>
                        {r.status === "accurate" ? "—" : `${r.discrepancy > 0 ? "−" : "+"}${currency}${Math.abs(r.discrepancy).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                      </td>
                      <td className={`${LEDGER_TD} text-right`}>
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                          r.status === "accurate" ? "bg-emerald-100 text-emerald-800" : r.status === "short" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {r.status === "accurate" ? "Accurate" : r.status === "short" ? "Short" : "Extra"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 6 && (
                <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] font-semibold text-text-muted">
                  +{rows.length - 6} more in full export
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-1 flex items-center justify-end border-t border-border-subtle pt-3">
          <button onClick={download} disabled={rows.length === 0} className={BTN_PRIMARY}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── MEDIA WATCHLIST CARD ─── */
const STATUS_OPTIONS: { id: MediaStatus | "all"; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "watching", label: "Watching / In Progress" },
  { id: "paused", label: "On Hold / Paused" },
  { id: "plan_to_watch", label: "Plan to Watch / Read" },
  { id: "completed", label: "Completed" },
  { id: "dropped", label: "Dropped" },
];

const MediaReportCard: React.FC<{ title: string; icon: React.ReactNode; type: MediaType; items: WatchlistItem[] }> = ({ title, icon, type, items }) => {
  const [status, setStatus] = useState<MediaStatus | "all">("all");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState("");
  const [addedFrom, setAddedFrom] = useState("");
  const [addedTo, setAddedTo] = useState("");

  const typeItems = useMemo(() => items.filter((i) => i.type === type), [items, type]);

  const filtered = useMemo(() => {
    return typeItems
      .filter((i) => {
        if (status !== "all" && i.status !== status) return false;
        const yFrom = parseInt(yearFrom, 10);
        if (!isNaN(yFrom) && (i.year || 0) < yFrom) return false;
        const yTo = parseInt(yearTo, 10);
        if (!isNaN(yTo) && (i.year || 0) > yTo) return false;
        const minR = parseFloat(minRating);
        if (!isNaN(minR) && (i.rating || 0) < minR) return false;
        const entryDate = i.createdAt ? toLocalDateStr(new Date(i.createdAt)) : "";
        if (addedFrom && (!entryDate || entryDate < addedFrom)) return false;
        if (addedTo && (!entryDate || entryDate > addedTo)) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [typeItems, status, yearFrom, yearTo, minRating, addedFrom, addedTo]);

  const download = () => {
    downloadCsv(
      `${type}_report_${todayStamp()}.csv`,
      ["Title", "Year", "Status", "Progress", "TotalEpisodes", "Score", "EntryDate", "LastUpdated"],
      filtered.map((i) => [
        i.title,
        i.year ?? "",
        i.status.replace(/_/g, " "),
        i.progress ?? "",
        i.totalEpisodes ?? "",
        i.rating ?? "",
        i.createdAt ? toLocalDateStr(new Date(i.createdAt)) : "",
        i.updatedAt ? toLocalDateStr(new Date(i.updatedAt)) : "",
      ])
    );
  };

  return (
    <div className={BENTO_CARD}>
      <ReportCardHeader title={title} icon={icon} count={filtered.length} noun="title" />
      <div className={CARD_BODY}>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as MediaStatus | "all")} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Year From</label>
            <input type="number" placeholder="e.g. 2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Year To</label>
            <input type="number" placeholder="e.g. 2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Min Rating Score (0-10)</label>
          <input type="number" min="0" max="10" placeholder="0–10" value={minRating} onChange={(e) => setMinRating(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
        </div>
        <div className="grid grid-cols-2 gap-2.5 border-t border-border-subtle pt-2.5">
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Added From</label>
            <input type="date" value={addedFrom} onChange={(e) => setAddedFrom(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-text-muted uppercase font-semibold">Added To</label>
            <input type="date" value={addedTo} onChange={(e) => setAddedTo(e.target.value)} className={`${INPUT_CLASS} text-xs`} />
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary/10">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={LEDGER_TH}>Title</th>
                  <th className={`${LEDGER_TH} text-right`}>Score</th>
                  <th className={`${LEDGER_TH} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 4).map((i) => (
                  <tr key={i.id} className="hover:bg-bg-secondary/40">
                    <td className={`${LEDGER_TD} max-w-[130px] truncate font-medium`}>{i.title}</td>
                    <td className={`${LEDGER_TD} text-right font-mono font-bold`}>{i.rating ?? "—"}</td>
                    <td className={`${LEDGER_TD} text-right whitespace-nowrap capitalize text-text-secondary`}>{i.status.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 4 && (
              <div className="border-t border-border-subtle bg-bg-primary/40 px-2.5 py-1.5 text-center text-[9.5px] font-semibold text-text-muted">
                +{filtered.length - 4} more in full export
              </div>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-end border-t border-border-subtle pt-3">
          <button onClick={download} disabled={filtered.length === 0} className={BTN_PRIMARY}>
            Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN REPORTS TAB ─── */
export const ReportsTab: React.FC<ReportsTabProps> = ({
  expenses,
  watchlist,
  investments = [],
  currency,
  salaryDay,
  salaryLog,
  isProUser,
  cycleHistory,
  reconciliations,
}) => {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeWatchlist = Array.isArray(watchlist) ? watchlist : [];
  const safeInvestments = Array.isArray(investments) ? investments : [];
  const safeSalaryLog = salaryLog || {};
  const safeCycleHistory = Array.isArray(cycleHistory) ? cycleHistory : [];
  const safeReconciliations = reconciliations || {};

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary">Data Export & Reports</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Filter, verify, and export your personal finance and media records into standard CSV format.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary tracking-[0.5px] uppercase bg-bg-secondary px-2.5 py-1 rounded">
          <Clock className="h-3 w-3" />
          <span>Report Generated {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Financial Reports Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[13px] font-bold tracking-[0.8px] text-text-secondary uppercase border-l-2 border-l-text-primary pl-2">
          💰 Financial Reports
        </h2>
        <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
          <ExpenseReportCard expenses={safeExpenses} currency={currency} salaryDay={salaryDay} salaryLog={safeSalaryLog} />
          <InvestmentReportCard investments={safeInvestments} currency={currency} />
          {isProUser && (
            <DiscrepancyReportCard cycleHistory={safeCycleHistory} reconciliations={safeReconciliations} currency={currency} />
          )}
        </div>
      </div>

      {/* Media Watchlist Reports Section */}
      <div className="flex flex-col gap-4 mt-2">
        <h2 className="text-[13px] font-bold tracking-[0.8px] text-text-secondary uppercase border-l-2 border-l-text-primary pl-2">
          🎬 Media Watchlist Reports
        </h2>
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
          <MediaReportCard title="Movies" icon={<Film className="h-4.5 w-4.5 text-text-secondary" />} type="movie" items={safeWatchlist} />
          <MediaReportCard title="TV Shows" icon={<Tv className="h-4.5 w-4.5 text-text-secondary" />} type="show" items={safeWatchlist} />
          <MediaReportCard title="Anime" icon={<Sparkles className="h-4.5 w-4.5 text-text-secondary" />} type="anime" items={safeWatchlist} />
          <MediaReportCard title="Books" icon={<BookOpen className="h-4.5 w-4.5 text-text-secondary" />} type="book" items={safeWatchlist} />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-bg-secondary/40 border border-border-subtle p-4 text-[10.5px] leading-relaxed text-text-muted">
        ⚠️ **Report Details**: All data exports are generated client-side from your cached browser session state. Filters applied above operate locally and do not alter the database or modify records displayed elsewhere in the application dashboard.
      </div>
    </div>
  );
};
