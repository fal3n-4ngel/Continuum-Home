import React from "react";
import { FirebaseUser } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";
import { AUTHOR, SITE_NAME } from "@/lib/site";
import { LogoMark } from "@/components/Logo";

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
  onClaimPro,
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
      <header className="sticky top-0 z-[100] hidden min-h-[52px] items-center justify-between border-b border-border-subtle bg-bg-card px-4 max-md:flex">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <LogoMark size={20} className="text-text-primary" />
          <span className="text-base font-medium tracking-tight text-text-primary">{SITE_NAME}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Pro button — free users */}
          {!isProUser && (
            <button
              onClick={onClaimPro}
              title="Upgrade to Pro"
              className="flex h-7 items-center justify-center gap-1 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/5 px-2.5 text-text-primary transition-all hover:bg-[#7c3aed]/10 active:scale-95"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-[#7c3aed] relative -top-[0.5px]">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[9px] font-semibold tracking-wider text-[#7c3aed] leading-none">GET PRO</span>
            </button>
          )}

          {/* Pro badge — pro users */}
          {isProUser && (
            <div title="Pro Account" className="flex h-7 items-center justify-center gap-1 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/5 px-2.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-[#7c3aed] relative -top-[0.5px]">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-[9px] font-semibold tracking-wider text-[#7c3aed] leading-none">PRO</span>
            </div>
          )}

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
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
          </a>
          {user && user.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL) && (
            <a
              onClick={() => setActiveTab("admin")}
              title="Admin Panel"
              className={`flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle cursor-pointer transition-colors ${
                activeTab === "admin"
                  ? "bg-text-primary text-bg-card"
                  : "bg-bg-primary text-text-secondary hover:text-text-primary"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </a>
          )}
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
        <div onClick={() => setActiveTab("agent")} className={mobileNavLinkClass(activeTab === "agent")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
          <span>Agent</span>
        </div>
      </nav>
    </>
  );
};
