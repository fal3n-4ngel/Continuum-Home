import React from "react";
import { FirebaseUser } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";
import { AUTHOR } from "@/lib/site";
import { LogoMark } from "@/components/Logo";

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  showInvestmentsTab: boolean;
  isProUser: boolean;
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

const mobileNavLinkClass = (active: boolean) =>
  `relative flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] px-1.5 pt-2 pb-1.5 text-[10px] font-medium no-underline transition-colors duration-150 ${
    active
      ? "font-bold text-text-primary after:absolute after:top-0 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:rounded-b-[3px] after:bg-text-primary after:content-['']"
      : "text-text-muted"
  }`;

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  showInvestmentsTab,
  isProUser,
  triggerConfirm,
  firebaseAuth,
  setExpenses,
  setWatchlist,
  setExpensesLoaded,
  disconnectAnilist,
  disconnectTrakt,
}) => {
  return (
    <>
      <header className="sticky top-0 z-[100] hidden min-h-[52px] items-center justify-between border-b border-border-subtle bg-bg-card px-4 py-3 max-md:flex">
        <div className="flex items-center gap-2">
        <LogoMark size={20} className="text-text-primary" />
        <span className="text-base font-medium tracking-tight text-text-primary">PHub Dashboard</span>
      </div>
        <div className="flex items-center gap-3">
          <a
            href={AUTHOR.coffeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Support this project"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          </a>
          <a
            href="/assistant"
            title="AI Integration Setup"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
              <path d="M19 11v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
            </svg>
          </a>
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
              className="h-7 w-7 cursor-pointer rounded-full bg-text-primary object-cover text-[11px] font-semibold text-white"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav className="fixed right-0 bottom-0 left-0 z-[1000] hidden min-h-[60px] items-stretch justify-around border-t border-border-subtle bg-bg-card pb-[env(safe-area-inset-bottom)] max-md:flex">
        <div onClick={() => setActiveTab("expenses")} className={mobileNavLinkClass(activeTab === "expenses")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Ledger</span>
        </div>
        {isProUser && (
          <div onClick={() => setActiveTab("financial")} className={mobileNavLinkClass(activeTab === "financial")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>Health</span>
          </div>
        )}
        {showInvestmentsTab && (
          <div onClick={() => setActiveTab("investments")} className={mobileNavLinkClass(activeTab === "investments")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Invest</span>
          </div>
        )}
        <div onClick={() => setActiveTab("media")} className={mobileNavLinkClass(activeTab === "media")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>Library</span>
        </div>
        <div onClick={() => setActiveTab("reports")} className={mobileNavLinkClass(activeTab === "reports")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Reports</span>
        </div>
      </nav>
    </>
  );
};
