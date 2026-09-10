"use client";

import React, { useState, useEffect } from "react";
import { Mail, Wallet, TrendingUp, RefreshCw, Coins, CalendarClock, Banknote, Trash2, Palette, Check, Shield, ExternalLink } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";
import { AUTHOR } from "@/lib/utils";

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
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

type SettingsSubTab = "appearance" | "general" | "notifications" | "account";

const BENTO_CARD = "rounded-2xl border border-border-subtle bg-bg-card shadow-subtle overflow-hidden";
const CARD_HEADER = "flex items-center justify-between border-b border-border-subtle bg-bg-primary/30 px-5 py-3.5";
const CARD_BODY = "flex flex-col gap-4 p-5 max-sm:p-4";
const FIELD_LABEL = "mb-1.5 block text-[11px] font-semibold text-text-secondary uppercase font-mono tracking-[0.5px]";
const SELECT_CLASS = "w-full rounded-full border border-border-subtle bg-bg-card px-3.5 py-2 text-xs font-semibold text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus shadow-2xs cursor-pointer";

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
    <span className="pointer-events-none absolute inset-0 rounded-full bg-border-subtle transition-colors duration-200 peer-checked:bg-text-primary" />
    <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-bg-card shadow-xs transition-transform duration-200 peer-checked:translate-x-5" />
  </label>
);

const EMAIL_ROWS: { key: keyof EmailSubscriptions; icon: React.ReactNode; badgeClass: string; title: string; description: string }[] = [
  {
    key: "expenses",
    icon: <Wallet size={14} />,
    badgeClass: "bg-accent-blue/15 text-accent-blue",
    title: "Expense Summaries",
    description: "Weekly and monthly spend breakdowns by category, sent to your inbox.",
  },
  {
    key: "portfolio",
    icon: <TrendingUp size={14} />,
    badgeClass: "bg-accent-yellow/15 text-accent-yellow",
    title: "Portfolio Updates",
    description: "A daily close-of-day valuation and P&L snapshot for your investments.",
  },
  {
    key: "subscriptions",
    icon: <RefreshCw size={14} />,
    badgeClass: "bg-accent-flame/15 text-accent-flame",
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
  isAdmin,
  onOpenAdmin,
}) => {
  const { themeId, setTheme, themes } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("appearance");
  const [themeFilter, setThemeFilter] = useState<"all" | "light" | "dark">("all");

  const [salaryDraft, setSalaryDraft] = useState<string>(monthlySalary ? String(monthlySalary) : "");
  const [additionalIncomeDraft, setAdditionalIncomeDraft] = useState<string>(additionalIncome ? String(additionalIncome) : "");

  useEffect(() => {
    setSalaryDraft(monthlySalary ? String(monthlySalary) : "");
  }, [monthlySalary]);

  useEffect(() => {
    setAdditionalIncomeDraft(additionalIncome ? String(additionalIncome) : "");
  }, [additionalIncome]);

  const toggleEmail = (key: keyof EmailSubscriptions) => {
    setEmailSubscriptions({ ...emailSubscriptions, [key]: !emailSubscriptions[key] });
  };

  const displayedThemes = themeFilter === "all" ? themes : themes.filter((t) => t.type === themeFilter);

  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <div>
        <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-1">Settings</h1>
        <p className="text-[13px] text-text-muted">Manage your preferences, appearance, and notifications.</p>
      </div>

      <div className="flex gap-6 border-b border-border-subtle max-sm:gap-4 max-sm:overflow-x-auto max-sm:scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab("appearance")}
          className={`relative pb-3 text-[13px] font-medium transition-all cursor-pointer ${
            activeSubTab === "appearance"
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Appearance
          {activeSubTab === "appearance" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`relative pb-3 text-[13px] font-medium transition-all cursor-pointer ${
            activeSubTab === "general"
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          General
          {activeSubTab === "general" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("notifications")}
          className={`relative pb-3 text-[13px] font-medium transition-all cursor-pointer ${
            activeSubTab === "notifications"
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Notifications
          {activeSubTab === "notifications" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("account")}
          className={`relative pb-3 text-[13px] font-medium transition-all cursor-pointer ${
            activeSubTab === "account"
              ? "text-text-primary font-semibold"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Account
          {activeSubTab === "account" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
          )}
        </button>
      </div>

      {activeSubTab === "appearance" && (
        <div className={`${BENTO_CARD} border-t-2 border-t-accent-yellow animate-[fadeIn_0.3s_ease_forwards]`}>
          <div className={CARD_HEADER}>
            <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-yellow/20 text-text-primary border border-border-subtle shadow-2xs">
                <Palette size={14} />
              </div>
              Appearance &amp; Color Theme
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setThemeFilter("all")}
                className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                  themeFilter === "all"
                    ? "border-text-primary bg-text-primary text-bg-card"
                    : "border-border-subtle bg-bg-primary/40 text-text-muted hover:text-text-primary"
                }`}
              >
                All ({themes.length})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilter("light")}
                className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                  themeFilter === "light"
                    ? "border-text-primary bg-text-primary text-bg-card"
                    : "border-border-subtle bg-bg-primary/40 text-text-muted hover:text-text-primary"
                }`}
              >
                Light ({themes.filter((t) => t.type === "light").length})
              </button>
              <button
                type="button"
                onClick={() => setThemeFilter("dark")}
                className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border transition-all cursor-pointer ${
                  themeFilter === "dark"
                    ? "border-text-primary bg-text-primary text-bg-card"
                    : "border-border-subtle bg-bg-primary/40 text-text-muted hover:text-text-primary"
                }`}
              >
                Dark ({themes.filter((t) => t.type === "dark").length})
              </button>
            </div>
          </div>
          <div className={CARD_BODY}>
            <p className="text-[12px] leading-relaxed text-text-secondary">
              Select your preferred color palette. Changes take effect across your entire dashboard immediately.
            </p>

            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {displayedThemes.map((t) => {
                const isActive = t.id === themeId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-start gap-2.5 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isActive
                        ? "border-text-primary bg-bg-primary/50 shadow-sm"
                        : "border-border-subtle bg-bg-card hover:border-border-hover hover:bg-bg-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{t.name}</span>
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-border-subtle bg-bg-primary/40 text-text-secondary">
                          {t.type}
                        </span>
                      </div>
                      {isActive && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-bg-card">
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 w-full py-0.5">
                      {t.swatches.map((color, idx) => (
                        <div
                          key={idx}
                          className="h-4 flex-1 rounded-sm border border-black/10 shadow-2xs"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>

                    <span className="text-[11px] leading-snug text-text-muted">
                      {t.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "general" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease_forwards]">
          <div className={`${BENTO_CARD} border-t-2 border-t-accent-blue`}>
            <div className={CARD_HEADER}>
              <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue/20 text-text-primary border border-border-subtle shadow-2xs">
                  <Coins size={14} />
                </div>
                Display Currency
              </h2>
            </div>
            <div className={CARD_BODY}>
              <div className="max-w-xs">
                <label className={FIELD_LABEL}>Currency Symbol</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={SELECT_CLASS}>
                  {CURRENCIES.map((c) => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] leading-relaxed text-text-muted">
                Changes the symbol shown next to amounts across the dashboard. Amounts themselves are not converted.
              </p>
            </div>
          </div>

          <div className={`${BENTO_CARD} border-t-2 border-t-accent-yellow`}>
            <div className={CARD_HEADER}>
              <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-yellow/20 text-text-primary border border-border-subtle shadow-2xs">
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
                      value={salaryDraft}
                      onChange={(e) => setSalaryDraft(e.target.value)}
                      onBlur={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setSalaryDraft(String(val) || "");
                        setMonthlySalary(val);
                      }}
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
                      value={additionalIncomeDraft}
                      onChange={(e) => setAdditionalIncomeDraft(e.target.value)}
                      onBlur={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        setAdditionalIncomeDraft(String(val) || "");
                        setAdditionalIncome(val);
                      }}
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
        </div>
      )}

      {activeSubTab === "notifications" && (
        <div className="flex flex-col gap-4 animate-[fadeIn_0.3s_ease_forwards]">
          <div className={`${BENTO_CARD} border-t-2 border-t-accent-flame`}>
            <div className={CARD_HEADER}>
              <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-flame/20 text-text-primary border border-border-subtle shadow-2xs">
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
        </div>
      )}

      {activeSubTab === "account" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease_forwards]">
          {isAdmin && onOpenAdmin && (
            <div className={`${BENTO_CARD} border-t-2 border-t-accent-blue`}>
              <div className={CARD_HEADER}>
                <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-blue/15 text-accent-blue border border-border-subtle shadow-2xs">
                    <Shield size={14} />
                  </div>
                  Admin Control Panel
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold text-text-primary">System &amp; Data Operations</p>
                  <p className="text-[11.5px] leading-relaxed text-text-muted max-w-md">
                    Access cron jobs, server metrics, cache flush operations, user Pro requests, and discord alert webhooks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="shrink-0 rounded-full border border-border-subtle bg-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-xs transition-all duration-200 hover:border-border-hover active:scale-95 cursor-pointer"
                >
                  Open Admin
                </button>
              </div>
            </div>
          )}

          <div className={BENTO_CARD}>
            <div className={CARD_HEADER}>
              <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-text-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-text-primary/10 text-text-primary border border-border-subtle shadow-2xs">
                  <ExternalLink size={14} />
                </div>
                Resources &amp; Support
              </h2>
            </div>
            <div className="flex flex-col divide-y divide-border-subtle">
              <a
                href={AUTHOR.coffeeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-5 hover:bg-bg-primary/50 transition-colors"
              >
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">Support Continuum</p>
                  <p className="text-[11.5px] leading-relaxed text-text-muted">Tip or buy a coffee to support continuous development.</p>
                </div>
                <ExternalLink size={14} className="text-text-muted shrink-0 ml-4" />
              </a>
              <a
                href="/assistant"
                className="flex items-center justify-between p-5 hover:bg-bg-primary/50 transition-colors"
              >
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">AI Assistant Integration</p>
                  <p className="text-[11.5px] leading-relaxed text-text-muted">Configure your API keys and model parameters for Kiroku.</p>
                </div>
                <ExternalLink size={14} className="text-text-muted shrink-0 ml-4" />
              </a>
            </div>
          </div>

          <div className={`${BENTO_CARD} border-t-2 border-t-[#b3666b]`}>
            <div className={CARD_HEADER}>
              <h2 className="flex items-center gap-2.5 text-[13px] font-bold tracking-tight text-[#b3666b]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b3666b]/15 text-[#b3666b] border border-[#b3666b]/30 shadow-2xs">
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
                  type="button"
                  onClick={onDeleteAccount}
                  className="shrink-0 rounded-full border border-[#b3666b] bg-[#b3666b] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#991b1b] active:scale-95 cursor-pointer"
                >
                  Delete Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
