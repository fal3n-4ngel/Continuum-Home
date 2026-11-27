"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { SITE_NAME, getAuthHeaders, toLocalDateStr, isUatDeployment } from "@/lib/utils";
import { safeLocalStorage } from "@/lib/utils/storage";
import { WatchlistItem, ReleaseNote } from "@/types";
import { useExpensesStore } from "@/lib/stores/expenses-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { useInvestmentsStore } from "@/lib/stores/investments-store";
import { usePayCycleData } from "@/hooks/usePayCycleData";
import { useDashboardAuth } from "@/hooks/dashboard/useDashboardAuth";
import { useDashboardSettings } from "@/hooks/dashboard/useDashboardSettings";
import { useSubscriptionsController } from "@/hooks/dashboard/useSubscriptionsController";
import { useInvestmentsController } from "@/hooks/dashboard/useInvestmentsController";
import { useMediaController } from "@/hooks/dashboard/useMediaController";
import LandingPage from "@/components/landing/LandingPage";
import { Sidebar, MobileHeader } from "@/components/layout";
import {
  ConfirmModal,
  SyncPreviewModal,
  OnboardingModal,
  MediaDetailsModal,
  ClaimProModal,
  DataCorrectionModal,
  DeleteAccountModal,
  ReleaseNotesModal,
  GoodreadsModal,
  QuickAddModal,
} from "@/components/modals";
import { InstallBanner } from "@/components/pwa";
import { KirokuTab } from "@/features/assistant";

const ExpensesTab = dynamic(() => import("@/features/expenses").then((mod) => mod.ExpensesTab));
const SubscriptionsTab = dynamic(() => import("@/features/expenses").then((mod) => mod.SubscriptionsTab));
const WatchlistTab = dynamic(() => import("@/features/media").then((mod) => mod.WatchlistTab));
const IntegrationsTab = dynamic(() => import("@/features/media").then((mod) => mod.IntegrationsTab));
const BooksTab = dynamic(() => import("@/features/media").then((mod) => mod.BooksTab));
const InvestmentsTab = dynamic(() => import("@/features/investments").then((mod) => mod.InvestmentsTab));
const FinancialHealthTab = dynamic(() => import("@/features/health").then((mod) => mod.FinancialHealthTab));
const ReportsTab = dynamic(() => import("@/features/reports").then((mod) => mod.ReportsTab));
const AdminTab = dynamic(() => import("@/features/admin").then((mod) => mod.AdminTab));
const SettingsTab = dynamic(() => import("@/features/settings").then((mod) => mod.SettingsTab));

export default function Dashboard() {
  const {
    expenses,
    setExpenses,
    expensesLoaded,
    setExpensesLoaded,
    setIsFetchingExpenses,
    expenseSearch,
    ledgerMinAmount,
    ledgerMaxAmount,
  } = useExpensesStore();
  const { expenseTab, confirmDlg, setConfirmDlg, triggerConfirm } = useUiStore();
  const {
    investments,
    isFetchingInvestments,
    investmentsLoaded,
    invName,
    invCategory,
    setInvCategory,
    invAmount,
    setInvAmount,
    invQuantity,
    setInvQuantity,
    invBuyPrice,
    setInvBuyPrice,
    invNotes,
    setInvNotes,
    invInterestRate,
    setInvInterestRate,
    invStartDate,
    setInvStartDate,
    invMaturityDate,
    setInvMaturityDate,
    invCompounding,
    setInvCompounding,
    invSipDay,
    setInvSipDay,
    invSuggestions,
    setInvSuggestions,
    isAddingAsset,
    isUpdatingPrices,
    showInvestmentsTab,
  } = useInvestmentsStore();

  const { user, authLoading, isProUser, setIsProUser, firebaseAuth } = useDashboardAuth();

  const [activeTab, setActiveTabState] = useState<string>("expenses");
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, []);
  const [mediaSubTab, setMediaSubTab] = useState<"watchlist" | "books" | "integrations">("watchlist");
  const [selectedMediaItem, setSelectedMediaItem] = useState<WatchlistItem | null>(null);
  const [showClaimPro, setShowClaimPro] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isDataCorrectionOpen, setIsDataCorrectionOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeReleaseNote, setActiveReleaseNote] = useState<ReleaseNote | null>(null);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [firestoreLastSeenRelease, setFirestoreLastSeenRelease] = useState<string | null>(null);

  const getHeaders = useCallback(() => getAuthHeaders(user?.idToken), [user]);

  const patchSettings = useCallback(
    async (data: Record<string, unknown>) => {
      if (user) {
        fetch("/api/settings", {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(data),
        }).catch((err) => console.error(err));
      }
    },
    [user, getHeaders]
  );

  const fetchExpenses = useCallback(async () => {
    setIsFetchingExpenses(true);
    try {
      const res = await fetch("/api/expenses", { headers: getHeaders() });
      if (res.ok) setExpenses(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingExpenses(false);
      setExpensesLoaded(true);
    }
  }, [getHeaders, setIsFetchingExpenses, setExpenses, setExpensesLoaded]);

  const media = useMediaController({
    user,
    getHeaders,
    patchSettings,
    triggerConfirm,
    setConfirmDlg,
  });

  const settings = useDashboardSettings({
    user,
    getHeaders,
    setIsProUser,
    setFirestoreLastSeenRelease,
    loadAnilistUser: media.loadAnilistUser,
    setAnilistUser: media.setAnilistUser,
    loadTraktUser: media.loadTraktUser,
    setTraktUser: media.setTraktUser,
    setLetterboxdUsername: media.setLetterboxdUsername,
    setGoodreadsUserId: media.setGoodreadsUserId,
  });

  const subs = useSubscriptionsController({
    getHeaders,
    triggerConfirm,
    onAutoPosted: fetchExpenses,
  });

  const inv = useInvestmentsController({
    user,
    getHeaders,
    triggerConfirm,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      safeLocalStorage.setItem("phub_embedded_token", tokenParam);
    }

    const queryTab = searchParams.get("tab");
    const hashTab = window.location.hash.replace("#", "");
    const tab = queryTab || hashTab;

    if (tab) {
      if (["expenses", "subscriptions", "investments", "financial", "reports", "agent", "admin", "settings"].includes(tab)) {
        setActiveTabState(tab);
      } else if (["watchlist", "books", "integrations"].includes(tab)) {
        setActiveTabState("media");
        setMediaSubTab(tab as "watchlist" | "books" | "integrations");
      } else if (tab === "health") {
        setActiveTabState("financial");
      }
    }
  }, []);

  useEffect(() => {
    const tabMap: Record<string, string> = {
      "1": "expenses",
      "2": "financial",
      "3": "investments",
      "4": "media",
      "5": "reports",
      "6": "agent",
      "7": "settings",
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowQuickAdd((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        setShowQuickAdd(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const nextTab = tabMap[e.key];
      if (nextTab) {
        e.preventDefault();
        setActiveTabState(nextTab);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!user || !settings.settingsLoaded) return;
    fetch("/api/release-notes/latest")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((relData) => {
        if (relData?.releaseNote && relData.releaseNote.active) {
          const note = relData.releaseNote as ReleaseNote;
          const localSeen = safeLocalStorage.getItem("continuum_last_seen_release");
          const lastSeen = firestoreLastSeenRelease || localSeen;
          if (lastSeen !== note.id && lastSeen !== note.version) {
            setActiveReleaseNote(note);
            setShowReleaseNotesModal(true);
          }
        }
      });
  }, [user, settings.settingsLoaded, firestoreLastSeenRelease]);

  const handleDismissReleaseNotes = useCallback(() => {
    if (activeReleaseNote) {
      const releaseId = activeReleaseNote.id || activeReleaseNote.version;
      safeLocalStorage.setItem("continuum_last_seen_release", releaseId);
      setFirestoreLastSeenRelease(releaseId);
      if (user) {
        fetch("/api/settings", {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ lastSeenRelease: releaseId }),
        }).catch((err) => console.error(err));
      }
    }
    setShowReleaseNotesModal(false);
  }, [activeReleaseNote, user, getHeaders]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bootstrap", { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (Array.isArray(data.expenses)) setExpenses(data.expenses);
          setExpensesLoaded(true);
          if (Array.isArray(data.watchlist)) media.hydrateWatchlist(data.watchlist);
          if (Array.isArray(data.subscriptions)) subs.hydrateSubscriptions(data.subscriptions);
          const portfolioList = Array.isArray(data.portfolio)
            ? data.portfolio
            : Array.isArray(data.portfolio?.assets)
            ? data.portfolio.assets
            : [];
          useInvestmentsStore.getState().setInvestments(portfolioList);
          useInvestmentsStore.getState().setInvestmentsLoaded(true);
          if (data.settings) settings.applySettingsData(data.settings);
          return;
        }
      } catch {}
      if (cancelled) return;
      Promise.allSettled([
        fetchExpenses(),
        media.fetchWatchlist(),
        subs.fetchSubscriptions(),
        inv.fetchInvestments(),
        settings.fetchSettings(),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !expensesLoaded) return;
    if (safeLocalStorage.getItem("phub_onboarding_seen")) return;
    safeLocalStorage.setItem("phub_onboarding_seen", "1");

    const hasIntegration = !!safeLocalStorage.getItem("anilist_token") || !!safeLocalStorage.getItem("trakt_access_token");
    if (expenses.length === 0 && !hasIntegration) {
      setShowOnboarding(true);
    }
  }, [user, expensesLoaded, expenses.length]);

  const { payCycle, cycleHistory, cycleAverages } = usePayCycleData({
    expenses,
    subscriptions: subs.subscriptions,
    salaryDay: settings.salaryDay,
    monthlySalary: settings.monthlySalary,
    additionalIncome: settings.additionalIncome,
    salaryLog: settings.salaryLog,
  });

  const logUnaccountedGap = async (amount: number) => {
    try {
      const isExpense = amount > 0;
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: isExpense ? "Unaccounted spending (reconciliation gap)" : "Unaccounted income / cash deposit",
          amount,
          category: "Other",
          date: toLocalDateStr(new Date()),
          notes: `Logged from Financial Health reconciliation for cycle ${payCycle.startStr} – ${payCycle.endStr}`,
        }),
      });
      if (res.ok) fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const isDataLoaded =
    !user || (expensesLoaded && media.watchlistLoaded && subs.subscriptionsLoaded && investmentsLoaded && settings.settingsLoaded);
  const isActiveTabReady =
    !user ||
    (settings.settingsLoaded &&
      (activeTab === "media"
        ? media.watchlistLoaded
        : activeTab === "investments"
        ? investmentsLoaded
        : activeTab === "financial"
        ? expensesLoaded && subs.subscriptionsLoaded
        : expensesLoaded));
  const showLoader = authLoading || !isActiveTabReady;
  const loaderAccentClass = isUatDeployment() ? "bg-[#DC2626]" : "bg-[#D99419]";

  if (showLoader) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-bg-primary text-text-primary">
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 0.35; transform: scale(0.95); }
            50% { opacity: 0.95; transform: scale(1.05); }
          }
          .bento-cell { animation: pulse-dot 1.4s ease-in-out infinite; }
          .bento-cell-1 { animation-delay: 0s; }
          .bento-cell-2 { animation-delay: 0.2s; }
          .bento-cell-3 { animation-delay: 0.4s; }
          .bento-cell-4 { animation-delay: 0.6s; }
        `}</style>
        <div className="flex flex-col items-center gap-6">
          <div className="grid grid-cols-2 gap-1.5 w-11 h-11">
            <div className="bento-cell bento-cell-1 rounded-[4px] bg-text-primary" />
            <div className={`bento-cell bento-cell-2 rounded-[4px] ${loaderAccentClass}`} />
            <div className={`bento-cell bento-cell-3 rounded-[4px] ${loaderAccentClass}`} />
            <div className="bento-cell bento-cell-4 rounded-[4px] bg-text-primary" />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center animate-[heroFadeUp_0.6s_ease-out_both]">
            <span className="font-body font-semibold text-lg tracking-tight">{SITE_NAME}</span>
            <span className="text-[12px] tracking-wide text-text-muted font-mono uppercase">
              {authLoading ? "Initializing security..." : "Fetching logs..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingPage
        onLogin={() => {
          if (firebaseAuth) {
            firebaseAuth
              .signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider())
              .catch((err: any) => {
                if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
                  firebaseAuth.signInWithRedirect(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
                } else {
                  console.error("Login failed:", err);
                }
              });
          }
        }}
        authError={undefined}
        firebaseAuthReady={!!firebaseAuth}
      />
    );
  }

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

  return (
    <div className="flex min-h-screen max-md:flex-col max-md:overflow-x-hidden">
      <MobileHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        showInvestmentsTab={showInvestmentsTab}
        isProUser={isProUser}
        onClaimPro={() => setShowClaimPro(true)}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        setExpenses={setExpenses}
        setWatchlist={media.setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
        disconnectAnilist={media.disconnectAnilist}
        disconnectTrakt={media.disconnectTrakt}
        onOpenQuickAdd={() => setShowQuickAdd(true)}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        anilistUser={media.anilistUser}
        traktUser={media.traktUser}
        connectAnilist={media.connectAnilist}
        disconnectAnilist={media.disconnectAnilist}
        syncAnilist={media.syncAnilist}
        isSyncingAnilist={media.isSyncingAnilist}
        connectTrakt={media.connectTrakt}
        disconnectTrakt={media.disconnectTrakt}
        syncTrakt={media.syncTrakt}
        isSyncingTrakt={media.isSyncingTrakt}
        letterboxdUsername={media.letterboxdUsername || null}
        connectLetterboxd={() => media.setShowLetterboxdModal(true)}
        disconnectLetterboxd={media.disconnectLetterboxd}
        syncLetterboxd={media.handleLetterboxdImport}
        isSyncingLetterboxd={media.isImportingLetterboxd}
        showInvestmentsTab={showInvestmentsTab}
        isProUser={isProUser}
        onClaimPro={() => setShowClaimPro(true)}
        setShowOnboarding={setShowOnboarding}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        setExpenses={setExpenses}
        setWatchlist={media.setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
        onOpenQuickAdd={() => setShowQuickAdd(true)}
      />

      <main className="ml-[250px] flex w-full max-w-[1680px] min-w-0 flex-1 flex-col gap-7 px-10 py-8 min-[769px]:max-[1100px]:ml-[210px] min-[769px]:max-[1100px]:gap-[22px] min-[769px]:max-[1100px]:px-7 min-[769px]:max-[1100px]:py-6 max-md:ml-0 max-md:w-full max-md:max-w-full max-md:overflow-x-hidden max-md:gap-3.5 max-md:p-3.5 max-md:pb-[calc(130px+env(safe-area-inset-bottom))]">
        {!isDataLoaded && (
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-bg-secondary">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-terracotta" />
          </div>
        )}
        <AnimatePresence initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="flex w-full flex-col gap-7 min-w-0"
          >
            {activeTab === "expenses" && (
              <>
                <ExpensesTab />

                {expenseTab === "subscriptions" && (
                  <SubscriptionsTab
                    subscriptions={subs.subscriptions}
                    sharedSubscriptions={subs.sharedSubscriptions}
                    currency={settings.currency}
                    subName={subs.subName}
                    setSubName={subs.setSubName}
                    subIcon={subs.subIcon}
                    setSubIcon={subs.setSubIcon}
                    subCost={subs.subCost}
                    setSubCost={subs.setSubCost}
                    subCycle={subs.subCycle}
                    setSubCycle={subs.setSubCycle}
                    subNextDate={subs.subNextDate}
                    setSubNextDate={subs.setSubNextDate}
                    subType={subs.subType}
                    setSubType={subs.setSubType}
                    subAutoPost={subs.subAutoPost}
                    setSubAutoPost={subs.setSubAutoPost}
                    subCategory={subs.subCategory}
                    setSubCategory={subs.setSubCategory}
                    subIsFamilyPlan={subs.subIsFamilyPlan}
                    setSubIsFamilyPlan={subs.setSubIsFamilyPlan}
                    subSendMemberEmails={subs.subSendMemberEmails}
                    setSubSendMemberEmails={subs.setSubSendMemberEmails}
                    subFamilyMembers={subs.subFamilyMembers}
                    setSubFamilyMembers={subs.setSubFamilyMembers}
                    continuumMemberEmails={subs.continuumMemberEmails}
                    checkFamilyMembers={subs.checkFamilyMembers}
                    logSharedSubscriptionPayment={subs.logSharedSubscriptionPayment}
                    dismissSharedSubscription={subs.dismissSharedSubscription}
                    isAddingSub={subs.isAddingSub}
                    addSubscription={subs.addSubscription}
                    deleteSubscription={subs.deleteSubscription}
                    updateSubscription={subs.updateSubscription}
                    updateSubscriptionIcon={subs.updateSubscriptionIcon}
                    toggleSubscriptionAutoPost={subs.toggleSubscriptionAutoPost}
                    syncDueSubscriptions={subs.syncDueSubscriptions}
                    isSyncingSubscriptions={subs.isSyncingSubscriptions}
                    isFetchingSubscriptions={subs.isFetchingSubscriptions}
                  />
                )}
              </>
            )}

            {activeTab === "media" && (
              <>
                <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-2">My Library</h1>
                <div className="mb-8 flex gap-6 border-b border-border-subtle max-sm:gap-4 max-sm:overflow-x-auto max-sm:scrollbar-none">
                  {(["watchlist", "books", "integrations"] as const).map((subTab) => (
                    <button
                      key={subTab}
                      onClick={() => setMediaSubTab(subTab)}
                      className={`relative pb-3 text-[13px] font-medium transition-all ${
                        mediaSubTab === subTab ? "text-text-primary" : "text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {subTab === "watchlist" ? "Cine" : subTab === "books" ? "Books" : "Integrations"}
                      {mediaSubTab === subTab && <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />}
                    </button>
                  ))}
                </div>

                {mediaSubTab === "watchlist" && (
                  <WatchlistTab
                    watchlist={media.watchlist}
                    watchlistFilter={media.watchlistFilter}
                    setWatchlistFilter={media.setWatchlistFilter}
                    mediaQuery={media.mediaQuery}
                    setMediaQuery={media.setMediaQuery}
                    mediaType={media.mediaType}
                    setMediaType={media.setMediaType}
                    searchMedia={media.searchMedia}
                    isSearchingMedia={media.isSearchingMedia}
                    searchResults={media.searchResults}
                    addToWatchlist={media.addToWatchlist}
                    updateWatchItem={media.updateWatchItem}
                    deleteWatchItem={media.deleteWatchItem}
                    isFetchingWatchlist={media.isFetchingWatchlist}
                    showLetterboxdModal={media.showLetterboxdModal}
                    setShowLetterboxdModal={media.setShowLetterboxdModal}
                    letterboxdUsername={media.letterboxdUsername}
                    setLetterboxdUsername={media.setLetterboxdUsername}
                    handleLetterboxdImport={media.handleLetterboxdImport}
                    isImportingLetterboxd={media.isImportingLetterboxd}
                    disconnectLetterboxd={media.disconnectLetterboxd}
                    anilistUser={media.anilistUser}
                    connectAnilist={media.connectAnilist}
                    disconnectAnilist={media.disconnectAnilist}
                    syncAnilist={media.syncAnilist}
                    isSyncingAnilist={media.isSyncingAnilist}
                    traktUser={media.traktUser}
                    connectTrakt={media.connectTrakt}
                    disconnectTrakt={media.disconnectTrakt}
                    syncTrakt={media.syncTrakt}
                    isSyncingTrakt={media.isSyncingTrakt}
                    enrichMissingPosters={media.enrichMissingPosters}
                    isEnrichingPosters={media.isEnrichingPosters}
                    onItemClick={(item) => setSelectedMediaItem(item)}
                    idToken={user?.idToken}
                    openDataCorrection={() => setIsDataCorrectionOpen(true)}
                  />
                )}

                {mediaSubTab === "books" && (
                  <BooksTab
                    watchlist={media.watchlist}
                    bookQuery={media.bookQuery}
                    setBookQuery={media.setBookQuery}
                    searchBooks={media.searchBooks}
                    isSearchingBooks={media.isSearchingBooks}
                    bookResults={media.bookResults}
                    addBook={media.addBook}
                    bookFilter={media.bookFilter}
                    setBookFilter={media.setBookFilter}
                    updateWatchItem={media.updateWatchItem}
                    deleteWatchItem={media.deleteWatchItem}
                    isFetchingWatchlist={media.isFetchingWatchlist}
                    enrichMissingBookCovers={media.enrichMissingBookCovers}
                    isEnrichingBookCovers={media.isEnrichingBookCovers}
                    onItemClick={setSelectedMediaItem}
                    idToken={user?.idToken}
                    openGoodreadsModal={() => media.setShowGoodreadsModal(true)}
                  />
                )}

                {mediaSubTab === "integrations" && (
                  <IntegrationsTab
                    watchlist={media.watchlist}
                    showLetterboxdModal={media.showLetterboxdModal}
                    setShowLetterboxdModal={media.setShowLetterboxdModal}
                    letterboxdUsername={media.letterboxdUsername}
                    setLetterboxdUsername={media.setLetterboxdUsername}
                    handleLetterboxdImport={media.handleLetterboxdImport}
                    isImportingLetterboxd={media.isImportingLetterboxd}
                    disconnectLetterboxd={media.disconnectLetterboxd}
                    anilistUser={media.anilistUser}
                    connectAnilist={media.connectAnilist}
                    disconnectAnilist={media.disconnectAnilist}
                    syncAnilist={media.syncAnilist}
                    isSyncingAnilist={media.isSyncingAnilist}
                    traktUser={media.traktUser}
                    connectTrakt={media.connectTrakt}
                    disconnectTrakt={media.disconnectTrakt}
                    syncTrakt={media.syncTrakt}
                    isSyncingTrakt={media.isSyncingTrakt}
                    goodreadsUserId={media.goodreadsUserId}
                    setShowGoodreadsModal={media.setShowGoodreadsModal}
                    handleGoodreadsSync={media.handleGoodreadsSync}
                    isSyncingGoodreads={media.isImportingGoodreads}
                    disconnectGoodreads={media.disconnectGoodreads}
                  />
                )}
              </>
            )}

            {activeTab === "investments" && (
              <InvestmentsTab
                investments={investments}
                currency={settings.currency}
                invName={invName}
                setInvName={inv.handleInvNameChange}
                invCategory={invCategory}
                setInvCategory={setInvCategory}
                invQuantity={invQuantity}
                setInvQuantity={setInvQuantity}
                invBuyPrice={invBuyPrice}
                setInvBuyPrice={setInvBuyPrice}
                invAmount={invAmount}
                setInvAmount={setInvAmount}
                invNotes={invNotes}
                setInvNotes={setInvNotes}
                invInterestRate={invInterestRate}
                setInvInterestRate={setInvInterestRate}
                invStartDate={invStartDate}
                setInvStartDate={setInvStartDate}
                invMaturityDate={invMaturityDate}
                setInvMaturityDate={setInvMaturityDate}
                invCompounding={invCompounding}
                setInvCompounding={setInvCompounding}
                invSipDay={invSipDay}
                setInvSipDay={setInvSipDay}
                isAddingAsset={isAddingAsset}
                addInvestment={inv.addInvestment}
                deleteInvestment={inv.deleteInvestment}
                sellInvestment={inv.sellInvestment}
                isUpdatingPrices={isUpdatingPrices}
                updateMarketPrices={inv.updateMarketPrices}
                isFetchingInvestments={isFetchingInvestments}
                invSuggestions={invSuggestions}
                setInvSuggestions={setInvSuggestions}
                selectSuggestion={inv.selectSuggestion}
              />
            )}

            {activeTab === "financial" && (
              <FinancialHealthTab
                currency={settings.currency}
                expenses={expenses}
                investments={investments}
                showInvestmentsTab={showInvestmentsTab}
                salaryDay={settings.salaryDay}
                monthlySalary={settings.monthlySalary}
                setMonthlySalary={settings.setMonthlySalary}
                additionalIncome={settings.additionalIncome}
                setAdditionalIncome={settings.setAdditionalIncome}
                payCycle={payCycle}
                savedReconciliation={settings.reconciliations[payCycle.startStr]}
                setReconciliation={settings.setReconciliation}
                salaryLog={settings.salaryLog}
                setSalaryLogEntry={settings.setSalaryLogEntry}
                cycleHistory={cycleHistory}
                cycleAverages={cycleAverages}
                reconciliations={settings.reconciliations}
                logUnaccountedGap={logUnaccountedGap}
                getHeaders={getHeaders}
                isProUser={isProUser}
                onClaimPro={() => setShowClaimPro(true)}
                aiOptOut={settings.aiOptOut}
                onOpenSettings={() => setActiveTab("settings")}
              />
            )}

            {activeTab === "reports" && (
              <ReportsTab
                expenses={expenses}
                watchlist={media.watchlist}
                investments={investments}
                currency={settings.currency}
                salaryDay={settings.salaryDay}
                salaryLog={settings.salaryLog}
                isProUser={isProUser}
                cycleHistory={cycleHistory}
                reconciliations={settings.reconciliations}
              />
            )}

            {activeTab === "agent" && (
              <KirokuTab
                idToken={user?.idToken}
                onOpenUpgrade={() => setShowClaimPro(true)}
                aiOptOut={settings.aiOptOut}
                onOpenSettings={() => setActiveTab("settings")}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                emailSubscriptions={settings.emailSubscriptions}
                setEmailSubscriptions={settings.setEmailSubscriptions}
                currency={settings.currency}
                setCurrency={settings.setCurrency}
                salaryDay={settings.salaryDay}
                setSalaryDay={settings.setSalaryDay}
                monthlySalary={settings.monthlySalary}
                setMonthlySalary={settings.setMonthlySalary}
                additionalIncome={settings.additionalIncome}
                setAdditionalIncome={settings.setAdditionalIncome}
                onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
                isAdmin={Boolean(user && user.email === adminEmail)}
                onOpenAdmin={() => setActiveTab("admin")}
                aiOptOut={settings.aiOptOut}
                setAiOptOut={settings.setAiOptOut}
              />
            )}

            {activeTab === "admin" && user && user.email === adminEmail && <AdminTab user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ConfirmModal confirmDlg={confirmDlg} setConfirmDlg={setConfirmDlg} />
      <SyncPreviewModal
        preview={media.syncPreview}
        onClose={() => media.setSyncPreview((prev) => ({ ...prev, isOpen: false }))}
      />
      <OnboardingModal
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        showInvestmentsTab={showInvestmentsTab}
      />

      {media.showLetterboxdModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex w-[400px] flex-col gap-4 rounded-card border border-border-subtle bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-[0.8px] text-text-secondary uppercase">Sync Letterboxd RSS</span>
              <button onClick={() => media.setShowLetterboxdModal(false)} className="cursor-pointer border-none bg-transparent p-1 text-base">✕</button>
            </div>
            <p className="text-xs leading-[1.4] text-text-muted">
              Enter your Letterboxd username to fetch and sync your recent watched diary entries from your public RSS feed.
            </p>
            <input
              type="text"
              placeholder="Username (e.g. fal3n4ngel)"
              value={media.letterboxdUsername}
              onChange={(e) => media.setLetterboxdUsername(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus"
            />
            <div className="flex justify-end gap-2.5">
              <button onClick={() => media.setShowLetterboxdModal(false)} className="h-9 cursor-pointer rounded-md border border-border-subtle bg-transparent px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary">
                Cancel
              </button>
              <button
                onClick={media.handleLetterboxdImport}
                disabled={media.isImportingLetterboxd || !media.letterboxdUsername.trim()}
                className="h-9 cursor-pointer rounded-md border border-text-primary bg-text-primary px-5 text-xs font-medium text-bg-primary transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {media.isImportingLetterboxd ? "Syncing..." : "Sync Feed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMediaItem && (
        <MediaDetailsModal
          item={selectedMediaItem}
          onClose={() => setSelectedMediaItem(null)}
          user={user}
          updateWatchItem={media.updateWatchItem}
        />
      )}

      {user && <ClaimProModal isOpen={showClaimPro} onClose={() => setShowClaimPro(false)} idToken={user.idToken} />}

      <DataCorrectionModal
        isOpen={isDataCorrectionOpen}
        onClose={() => setIsDataCorrectionOpen(false)}
        watchlist={media.watchlist}
        getHeaders={getHeaders}
        triggerAlert={media.triggerAlert}
        onSuccess={() => {
          setIsDataCorrectionOpen(false);
          media.fetchWatchlist();
        }}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirmDelete={async () => {
          const res = await fetch("/api/settings", { method: "DELETE", headers: getHeaders() });
          if (res.ok) {
            if (firebaseAuth?.auth) {
              await firebaseAuth.signOut(firebaseAuth.auth).catch(() => {});
            }
            safeLocalStorage.clear();
            window.location.reload();
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to delete account. Please try again.");
          }
        }}
      />

      <ReleaseNotesModal
        isOpen={showReleaseNotesModal}
        onClose={handleDismissReleaseNotes}
        releaseNote={activeReleaseNote}
      />

      <GoodreadsModal
        isOpen={media.showGoodreadsModal}
        onClose={() => media.setShowGoodreadsModal(false)}
        userId={media.goodreadsUserId}
        setUserId={media.setGoodreadsUserId}
        onRssSync={media.handleGoodreadsSync}
        onCsvImport={media.handleGoodreadsCsvImport}
        isSyncing={media.isImportingGoodreads}
      />

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        currency={settings.currency}
        categories={Array.from(new Set(expenses.map((e) => e.category).filter((c): c is string => Boolean(c)))).sort()}
        getHeaders={getHeaders}
        onCreated={fetchExpenses}
        onNavigateTab={setActiveTab}
        showInvestmentsTab={showInvestmentsTab}
      />

      <InstallBanner />
    </div>
  );
}
