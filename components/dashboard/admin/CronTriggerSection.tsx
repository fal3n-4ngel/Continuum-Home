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
    <div className="flex flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle">
      <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
        <Mail className="h-4 w-4" /> Trigger Automated Crons
      </h3>
      <p className="text-[12.5px] leading-relaxed text-text-secondary">
        Manually trigger automated tasks. This fires notifications and emails to registered cloud users.
      </p>

      <div className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-[#fecaca]" />
          <span className="font-mono text-[8.5px] font-bold text-[#dc2626] tracking-widest flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> PRODUCTION CRONS
          </span>
          <div className="flex-1 border-t border-[#fecaca]" />
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
          <div key={task.id} className="rounded-lg border border-[#fecaca]/60 bg-[#fef2f2]/40 p-3.5 hover:bg-[#fef2f2]/60 transition-colors flex justify-between items-center gap-4">
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
                  className="cursor-pointer rounded-md border border-[#3b82f6] bg-[#eff6ff] text-[10.5px] font-semibold text-[#1d4ed8] px-2.5 py-1.5 transition-all hover:bg-[#dbeafe] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewLoading ? "..." : "Preview"}
                </button>
              )}
              <button
                disabled={cronRunning !== null}
                onClick={() => handleProductionCronClick(task.id, task.title)}
                className="cursor-pointer rounded-md border border-[#dc2626] bg-transparent text-[10.5px] font-semibold text-[#dc2626] px-2.5 py-1.5 transition-all hover:bg-[#dc2626] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
