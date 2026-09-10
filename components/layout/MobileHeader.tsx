import React from "react";
import { FirebaseUser } from "@/types";
import { AUTHOR, isSafeImageUrl } from "@/lib/utils";
import { SITE_NAME } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";
import { motion } from "framer-motion";

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  showInvestmentsTab: boolean;
  isProUser: boolean;
  onClaimPro: () => void;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive?: boolean,
    confirmText?: string
  ) => void;
  firebaseAuth: any;
  setExpenses: (val: any[]) => void;
  setWatchlist: (val: any[]) => void;
  setExpensesLoaded: (val: boolean) => void;
  disconnectAnilist: () => void;
  disconnectTrakt: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  showInvestmentsTab,
  isProUser,
  onClaimPro,
  triggerConfirm,
  firebaseAuth,
  setExpenses,
  setWatchlist,
  setExpensesLoaded,
  disconnectAnilist,
  disconnectTrakt,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <header className="sticky top-0 z-[100] hidden min-h-[52px] items-center justify-between border-b border-border-subtle bg-bg-card px-4 max-md:flex">
        <div className="flex items-center gap-2 shrink-0">
          <LogoMark size={20} className="text-text-primary" />
          <span className="text-base font-medium tracking-tight text-text-primary">{SITE_NAME}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
   

    

          <a
            href={AUTHOR.coffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Support this project"
             className="shrink-0 flex h-9 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-secondary transition-colors hover:text-text-primary hover:border-border-hover cursor-pointer shadow-2xs"
      >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </a>

  
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={toggleTheme}
            title={theme.type === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={theme.type === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="shrink-0 flex  items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-secondary transition-colors hover:text-text-primary hover:border-border-hover cursor-pointer shadow-2xs"
          >
            {theme.type === "dark" ? (
              <Sun className="h-3.5 w-3.5 text-amber-400 dark:text-amber-300 stroke-[2.2]" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-text-secondary stroke-[2.2]" />
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            title="Settings"
            aria-label="Settings"
            className={`shrink-0 flex items-center justify-center rounded-full border border-border-subtle cursor-pointer transition-colors ${activeTab === "settings"
                ? "bg-bg-secondary text-text-primary border-border-hover"
                : "bg-bg-primary text-text-secondary hover:text-text-primary"
              }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>

          {user && (
            <img
              src={isSafeImageUrl(user.photoURL) ? user.photoURL : undefined}
              alt="Profile"
              onClick={() => {
                triggerConfirm("Sign Out", "Are you sure you want to sign out?", async () => {
                  if (firebaseAuth) {
                    await firebaseAuth.signOut(firebaseAuth.auth);
                    setExpenses([]);
                    setWatchlist([]);
                    setExpensesLoaded(false);
                    disconnectAnilist();
                    disconnectTrakt();
                  }
                }, false, "Sign Out");
              }}
              className="shrink-0 h-7 w-7 cursor-pointer rounded-full bg-text-primary object-cover text-[11px] font-semibold text-bg-primary border border-border-subtle"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </header>

      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-4 left-0 right-0 z-[1000] hidden max-md:flex items-center justify-center px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]"
      >
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card/95 py-2 px-2 shadow-[0_14px_40px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            aria-label="Ledger"
            className={
              activeTab === "expenses"
                ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
            }
          >
            {activeTab === "expenses" && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "expenses" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "expenses" ? "relative -top-[0.5px] z-10" : ""}`}>
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            {activeTab === "expenses" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Ledger</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            aria-label="Health"
            className={
              activeTab === "financial"
                ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
            }
          >
            {activeTab === "financial" && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "financial" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "financial" ? "relative -top-[0.5px] z-10" : ""}`}>
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            {activeTab === "financial" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Health</span>}
          </button>

          {showInvestmentsTab && (
            <button
              type="button"
              onClick={() => setActiveTab("investments")}
              aria-label="Invest"
              className={
                activeTab === "investments"
                  ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                  : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
              }
            >
              {activeTab === "investments" && (
                <motion.div
                  layoutId="mobileNavActivePill"
                  className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "investments" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "investments" ? "relative -top-[0.5px] z-10" : ""}`}>
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {activeTab === "investments" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Invest</span>}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            aria-label="Library"
            className={
              activeTab === "media"
                ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
            }
          >
            {activeTab === "media" && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "media" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "media" ? "relative -top-[0.5px] z-10" : ""}`}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="3" />
            </svg>
            {activeTab === "media" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Library</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            aria-label="Reports"
            className={
              activeTab === "reports"
                ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
            }
          >
            {activeTab === "reports" && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "reports" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "reports" ? "relative -top-[0.5px] z-10" : ""}`}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {activeTab === "reports" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Reports</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            aria-label="Agent"
            className={
              activeTab === "agent"
                ? "relative flex h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-text-primary shrink-0 cursor-pointer select-none"
                : "relative flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:text-text-primary hover:bg-black/5 active:scale-95 shrink-0 cursor-pointer select-none dark:hover:bg-white/5"
            }
          >
            {activeTab === "agent" && (
              <motion.div
                layoutId="mobileNavActivePill"
                className="absolute inset-0 rounded-full bg-bg-secondary shadow-xs"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "agent" ? "2.1" : "1.85"} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${activeTab === "agent" ? "relative -top-[0.5px] z-10" : ""}`}>
              <path d="M12 8V4H8" />
              <rect x="4" y="8" width="16" height="12" rx="3" />
              <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
            </svg>
            {activeTab === "agent" && <span className="relative z-10 text-xs font-semibold whitespace-nowrap leading-none tracking-tight">Agent</span>}
          </button>
        </div>
      </nav>
    </>
  );
};
