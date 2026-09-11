import React from "react";
import { LogoMark } from "@/components/Logo";
import {
  X,
  Bot,
  Wallet,
  TrendingUp,
  Clapperboard,
  BookOpen,
  RotateCw,
  FileText,
} from "lucide-react";

interface OnboardingModalProps {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showInvestmentsTab: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  showOnboarding,
  setShowOnboarding,
  showInvestmentsTab,
}) => {
  if (!showOnboarding) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setShowOnboarding(false)}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[540px] flex-col gap-5 overflow-y-auto rounded-2xl border border-border-subtle bg-bg-card p-6 sm:p-7 shadow-subtle animate-[fadeInScale_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-secondary text-text-primary shadow-2xs">
              <LogoMark size={22} className="text-text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-normal italic tracking-tight text-text-primary">
                  Welcome to Continuum
                </h2>
                <span className="inline-flex shrink-0 items-center rounded-full border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-text-muted uppercase">
                  Hub
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Your quiet, unified space for personal finance, culture, and intelligence.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOnboarding(false)}
            className="flex h-8 w-8 min-w-[32px] min-h-[32px] aspect-square p-0 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-muted transition-all duration-200 hover:bg-bg-primary hover:text-text-primary hover:border-border-hover shadow-2xs"
            aria-label="Close"
          >
            <X size={14} className="shrink-0" />
          </button>
        </div>

        <p className="text-xs font-medium text-text-muted -mb-1">
          Here&apos;s everything you&apos;ve got in one place:
        </p>

        <div className="flex flex-col gap-2.5">
          {[
            {
              icon: <Bot size={17} strokeWidth={1.75} />,
              title: "AI Assistant",
              desc: "Connect ChatGPT, Claude, or Groq via Permanent API Key & OpenAPI — log expenses or update your watchlist by chatting.",
              featured: true,
            },
            {
              icon: <Wallet size={17} strokeWidth={1.75} />,
              title: "Expense Ledger",
              desc: "Log transactions, tag categories, and set a custom salary-cycle day to see spending by pay period instead of calendar month.",
            },
            ...(showInvestmentsTab
              ? [
                  {
                    icon: <TrendingUp size={17} strokeWidth={1.75} />,
                    title: "Investments",
                    desc: "Track equities, crypto, mutual funds, gold, and cash in one portfolio view.",
                  },
                ]
              : []),
            {
              icon: <Clapperboard size={17} strokeWidth={1.75} />,
              title: "Watchlist",
              desc: "Movies, shows, and anime in one place — sync bidirectionally with AniList & Trakt, or import a Letterboxd CSV export.",
            },
            {
              icon: <BookOpen size={17} strokeWidth={1.75} />,
              title: "Book Library",
              desc: "Search OpenLibrary to add books and track your reading progress.",
            },
            {
              icon: <RotateCw size={17} strokeWidth={1.75} />,
              title: "Subscriptions",
              desc: "Keep tabs on recurring monthly/yearly costs and your true effective monthly spend.",
            },
            {
              icon: <FileText size={17} strokeWidth={1.75} />,
              title: "Notes",
              desc: "A lightweight, auto-saving scratchpad for quick thoughts.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`group flex items-start gap-3 rounded-xl border transition-all duration-200 ${
                f.featured
                  ? "border-border-subtle bg-bg-secondary/60 p-3 shadow-2xs"
                  : "border-transparent p-2 hover:bg-bg-secondary/40"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-colors ${
                  f.featured
                    ? "border-border-subtle bg-bg-primary text-text-primary"
                    : "border-border-subtle/70 bg-bg-secondary/50 text-text-secondary group-hover:text-text-primary group-hover:bg-bg-secondary"
                }`}
              >
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-text-primary">
                    {f.title}
                  </p>
                  {f.featured && (
                    <span className="rounded-full border border-border-subtle bg-bg-primary px-2 py-0.2 font-mono text-[9px] font-semibold tracking-wider text-text-secondary uppercase shadow-2xs">
                      Flagship
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border-subtle pt-4">
          <button
            type="button"
            onClick={() => setShowOnboarding(false)}
            className="cursor-pointer rounded-full border border-border-subtle bg-bg-secondary px-5 py-2 text-xs font-semibold text-text-secondary shadow-2xs transition-all duration-200 hover:bg-bg-primary hover:text-text-primary hover:border-border-hover"
          >
            Skip for now
          </button>
          <a
            href="/assistant"
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-text-primary bg-text-primary px-5 py-2 text-xs font-semibold text-bg-primary shadow-xs transition-all duration-200 hover:opacity-90 active:scale-95 no-underline"
          >
            <Bot size={13} />
            <span>Connect AI Agent</span>
            <span className="text-xs">→</span>
          </a>
        </div>
      </div>
    </div>
  );
};
