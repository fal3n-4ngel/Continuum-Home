"use client";

import React from "react";
import { Mail, Wallet, TrendingUp, RefreshCw, Coins, CalendarClock, Banknote, Trash2 } from "lucide-react";

export interface EmailSubscriptions {
  expenses: boolean;
  portfolio: boolean;
  subscriptions: boolean;
}

interface SettingsTabProps {
  emailSubscriptions: EmailSubscriptions;
  setEmailSubscriptions: (next: EmailSubscriptions) => void;
  currency: string;
  setCurrency: (c: string) => void;
  salaryDay: number;
  setSalaryDay: (d: number) => void;
  monthlySalary: number;
  setMonthlySalary: (v: number) => void;
  additionalIncome: number;
  setAdditionalIncome: (v: number) => void;
  onDeleteAccount?: () => void;
}

const BENTO_CARD = "rounded-2xl border border-border-subtle bg-bg-card shadow-subtle overflow-hidden";
const CARD_HEADER = "flex items-center justify-between border-b border-border-subtle bg-bg-primary/30 px-5 py-3.5";
const CARD_BODY = "flex flex-col gap-4 p-5 max-sm:p-4";
const FIELD_LABEL = "mb-1.5 block text-[11px] font-semibold text-text-secondary uppercase font-mono tracking-[0.5px]";
const SELECT_CLASS = "w-full rounded-full border border-border-subtle bg-white px-3.5 py-2 text-xs font-semibold text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus shadow-2xs cursor-pointer";

const CURRENCIES = [
  { symbol: "₹", label: "INR (₹)" },
  { symbol: "$", label: "USD ($)" },
  { symbol: "€", label: "EUR (€)" },
  { symbol: "£", label: "GBP (£)" },
  { symbol: "¥", label: "JPY (¥)" },
];

const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
    <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
    <span className="pointer-events-none absolute inset-0 rounded-full bg-[#EAE5DC] transition-colors duration-200 peer-checked:bg-text-primary" />
    <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 peer-checked:translate-x-5" />
  </label>
);

const EMAIL_ROWS: { key: keyof EmailSubscriptions; icon: React.ReactNode; badgeClass: string; title: string; description: string }[] = [
  {
    key: "expenses",
    icon: <Wallet size={14} />,
    badgeClass: "bg-[#EBF5FF] text-[#4A7C9D]",
    title: "Expense Summaries",
    description: "Weekly and monthly spend breakdowns by category, sent to your inbox.",
  },
  {
    key: "portfolio",
    icon: <TrendingUp size={14} />,
    badgeClass: "bg-[#E6F4EA] text-[#2e7d32]",
    title: "Portfolio Updates",
    description: "A daily close-of-day valuation and P&L snapshot for your investments.",
  },
  {
    key: "subscriptions",
    icon: <RefreshCw size={14} />,
    badgeClass: "bg-[#FDF6F0] text-[#e39282]",
    title: "Subscription Renewal Alerts",
    description: "A heads-up 2–3 days before a tracked subscription renews.",
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  emailSubscriptions,
  setEmailSubscriptions,
  currency,
  setCurrency,
  salaryDay,
  setSalaryDay,
  monthlySalary,
  setMonthlySalary,
  additionalIncome,
  setAdditionalIncome,
  onDeleteAccount,
}) => {
  const toggleEmail = (key: keyof EmailSubscriptions) => {
    setEmailSubscriptions({ ...emailSubscriptions, [key]: !emailSubscriptions[key] });
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <div>
        <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-1">Settings</h1>
        <p className="text-[13px] text-text-muted">Manage your preferences and how Continuum Home reaches you.</p>
      </div>

      {/* Currency */}
      <div className={`${BENTO_CARD} border-t-2 border-t-accent-blue/80`}>
        <div className={CARD_HEADER}>
          <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBF5FF] text-[#4A7C9D] border border-[#A0C4E2]/30 shadow-2xs">
              <Coins size={14} />
            </div>
            Currency
          </h2>
        </div>
        <div className={CARD_BODY}>
          <div className="max-w-xs">
            <label className={FIELD_LABEL}>Display currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={SELECT_CLASS}>
              {CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            Changes the symbol shown next to amounts across the dashboard. Amounts themselves aren't converted.
          </p>
        </div>
      </div>

      {/* Income & Pay Cycle */}
      <div className={`${BENTO_CARD} border-t-2 border-t-[#2e7d32]/70`}>
        <div className={CARD_HEADER}>
          <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E6F4EA] text-[#2e7d32] border border-[#2e7d32]/20 shadow-2xs">
              <CalendarClock size={14} />
            </div>
            Income &amp; Pay Cycle
          </h2>
        </div>
        <div className={CARD_BODY}>
          <div className="max-w-xs">
            <label className={FIELD_LABEL}>Payday</label>
            <select value={salaryDay} onChange={(e) => setSalaryDay(parseInt(e.target.value, 10))} className={SELECT_CLASS}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                  {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of month
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className={FIELD_LABEL}>Usual Salary</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-xs font-bold text-text-muted">{currency}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={monthlySalary || ""}
                  onChange={(e) => setMonthlySalary(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`${SELECT_CLASS} pl-7`}
                />
              </div>
            </div>
            <div>
              <label className={FIELD_LABEL}>Additional Income</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-xs font-bold text-text-muted">{currency}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={additionalIncome || ""}
                  onChange={(e) => setAdditionalIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`${SELECT_CLASS} pl-7`}
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-text-muted">
            <Banknote size={11} className="mr-1 inline-block align-[-1px]" />
            Used to build your salary-cycle view in Expenses and your baseline income in Financial Health.
          </p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className={`${BENTO_CARD} border-t-2 border-t-[#e39282]/80`}>
        <div className={CARD_HEADER}>
          <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDF6F0] text-[#e39282] border border-[#e39282]/30 shadow-2xs">
              <Mail size={14} />
            </div>
            Email Notifications
          </h2>
        </div>
        <div className="flex flex-col divide-y divide-border-subtle">
          {EMAIL_ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-4 px-5 py-4 max-sm:px-4 max-sm:py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 shadow-2xs ${row.badgeClass}`}>
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary">{row.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-muted">{row.description}</p>
                </div>
              </div>
              <Toggle checked={emailSubscriptions[row.key]} onChange={() => toggleEmail(row.key)} label={row.title} />
            </div>
          ))}
        </div>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-text-muted">
        Every automated email also includes a one-click unsubscribe link in its footer, which flips the matching toggle above.
        Changes on this page save automatically.
      </p>

      {/* Danger Zone / Account Deletion */}
      <div className={`${BENTO_CARD} border-t-2 border-t-[#b3666b]/80 mt-2`}>
        <div className={CARD_HEADER}>
          <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-[#b3666b]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDF6F0] text-[#b3666b] border border-[#b3666b]/30 shadow-2xs">
              <Trash2 size={14} />
            </div>
            Danger Zone
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-text-primary">Delete Account &amp; Data</p>
            <p className="text-[11.5px] leading-relaxed text-text-muted max-w-md">
              Permanently delete your account and purge all associated data across expenses, portfolio, subscriptions, and watchlists. This action cannot be undone.
            </p>
          </div>
          {onDeleteAccount && (
            <button
              onClick={onDeleteAccount}
              className="shrink-0 rounded-full border border-[#b3666b] bg-[#b3666b] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#991b1b] active:scale-95 cursor-pointer"
            >
              Delete Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
