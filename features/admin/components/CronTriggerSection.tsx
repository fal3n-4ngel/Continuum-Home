import React from "react";
import { Mail, AlertTriangle, Bell, BarChart2, Sparkles } from "lucide-react";

interface CronTriggerSectionProps {
  previewLoading: boolean;
  cronRunning: string | null;
  sendPreviewEmail: (id: string) => void;
  handleProductionCronClick: (id: string, title: string) => void;
}

export const CronTriggerSection: React.FC<CronTriggerSectionProps> = ({
  previewLoading,
  cronRunning,
  sendPreviewEmail,
  handleProductionCronClick,
}) => {
  return (
    <div className="flex flex-col gap-4 rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-subtle">
      <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3">
        <Mail className="h-4 w-4" /> Trigger Automated Crons
      </h3>
      <p className="text-[12.5px] leading-relaxed text-text-secondary">
        Manually trigger automated tasks. This fires notifications and emails to registered cloud users.
      </p>

      <div className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t-2 border-border-subtle" />
          <span className="font-mono text-[8.5px] font-bold text-rose-500 dark:text-rose-400 tracking-widest flex items-center gap-1.5 uppercase">
            <AlertTriangle className="h-3 w-3 text-rose-500 dark:text-rose-400" /> Production Crons
          </span>
          <div className="flex-1 border-t-2 border-border-subtle" />
        </div>

        {[
          {
            id: "subscriptions",
            previewId: "subscriptions",
            title: "Subscription Warnings",
            desc: "Alerts users of subscriptions renewing in 2-3 days.",
            icon: <Bell className="h-4 w-4 text-text-secondary" />,
            hasPreview: true,
          },
          {
            id: "expenses_weekly",
            previewId: "expenses_weekly",
            title: "Weekly Expense Summary",
            desc: "Dispatches 7-day category summary and burn rate.",
            icon: <BarChart2 className="h-4 w-4 text-text-secondary" />,
            hasPreview: true,
          },
          {
            id: "expenses_monthly",
            previewId: "expenses_monthly",
            title: "Monthly Expense Summary",
            desc: "Dispatches 30-day top outflows and category charts.",
            icon: <BarChart2 className="h-4 w-4 text-text-secondary" />,
            hasPreview: true,
          },
          {
            id: "portfolio",
            previewId: "portfolio",
            title: "Daily Portfolio Wrap",
            desc: "Calculates stock valuations and emails daily close Net P&L.",
            icon: <Mail className="h-4 w-4 text-text-secondary" />,
            hasPreview: true,
          },
          {
            id: "recommendations",
            previewId: null,
            title: "Daily AI Recommendations",
            desc: "Refreshes system suggestions for watchlist additions.",
            icon: <Sparkles className="h-4 w-4 text-text-secondary" />,
            hasPreview: false,
          },
        ].map((task) => (
          <div
            key={task.id}
            className="rounded-none border-2 border-border-subtle bg-bg-primary/20 p-3.5 hover:bg-bg-primary/40 hover:border-text-primary/30 transition-colors flex justify-between items-center gap-4"
          >
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                {task.icon} {task.title}
              </h4>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{task.desc}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {task.hasPreview && (
                <button
                  disabled={previewLoading || cronRunning !== null}
                  onClick={() => sendPreviewEmail(task.previewId!)}
                  className="cursor-pointer rounded-none border border-border-subtle bg-bg-card text-[10.5px] font-semibold text-text-primary px-2.5 py-1.5 transition-all hover:bg-bg-primary hover:border-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewLoading ? "..." : "Preview"}
                </button>
              )}
              <button
                disabled={cronRunning !== null}
                onClick={() => handleProductionCronClick(task.id, task.title)}
                className="cursor-pointer rounded-none border border-rose-500/40 bg-rose-500/10 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 px-2.5 py-1.5 transition-all hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cronRunning === task.id ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
