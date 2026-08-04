"use client";
import { SITE_NAME } from "@/lib/site";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FirebaseUser,
  AniListUser,
  TraktUser,
  Expense,
  WatchlistItem,
  Subscription,
  InvestmentAsset,
  InvestmentCategory,
  SearchResult,
  InvestmentQuote,
  FdCompounding,
} from "@/types";
import { getNextFutureBillingDate, resolvePayCycle, buildCycleHistory, toLocalDateStr } from "@/lib/dates";
import { anilistQuery } from "@/lib/anilist";
import { traktRequest } from "@/lib/trakt-client";
import { pushWatchlistUpdate } from "@/lib/sync-push";
import type { SyncEntry } from "@/lib/firebase";

// Modular Dashboard Components
import LandingPage from "@/components/landing/LandingPage";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { ConfirmModal, ConfirmState } from "@/components/dashboard/ConfirmModal";
import { SyncPreviewModal, SyncPreviewState, SyncPreviewItem } from "@/components/dashboard/SyncPreviewModal";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";
import { MediaDetailsModal } from "@/components/dashboard/MediaDetailsModal";
import { KirokuChatBubble } from "@/components/dashboard/KirokuChatBubble";
import { ClaimProModal } from "@/components/dashboard/ClaimProModal";
import { DataCorrectionModal } from "@/components/dashboard/DataCorrectionModal";

// Dynamically import heavy dashboard tabs to optimize initial bundle size
const ExpensesTab = dynamic(() => import("@/components/dashboard/ExpensesTab").then((mod) => mod.ExpensesTab));
const SubscriptionsTab = dynamic(() => import("@/components/dashboard/SubscriptionsTab").then((mod) => mod.SubscriptionsTab));
const WatchlistTab = dynamic(() => import("@/components/dashboard/WatchlistTab").then((mod) => mod.WatchlistTab));
const IntegrationsTab = dynamic(() => import("@/components/dashboard/IntegrationsTab").then((mod) => mod.IntegrationsTab));
const BooksTab = dynamic(() => import("@/components/dashboard/BooksTab").then((mod) => mod.BooksTab));
const InvestmentsTab = dynamic(() => import("@/components/dashboard/InvestmentsTab").then((mod) => mod.InvestmentsTab));
const FinancialHealthTab = dynamic(() => import("@/components/dashboard/FinancialHealthTab").then((mod) => mod.FinancialHealthTab));
const ReportsTab = dynamic(() => import("@/components/dashboard/ReportsTab").then((mod) => mod.ReportsTab));
const AdminTab = dynamic(() => import("@/components/dashboard/AdminTab").then((mod) => mod.AdminTab));

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signInWithRedirect: any;
  signOut: any;
}

// Ticker/symbol lookup only makes sense for these investment categories — FD,
// cash, gold, and other are free-text labels with nothing to search a market for.
const TICKER_SEARCH_CATEGORIES: InvestmentCategory[] = ["equity", "crypto", "mutual_fund", "sip"];

export default function Dashboard() {
  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<string>("expenses");
  const [mediaSubTab, setMediaSubTab] = useState<"watchlist" | "books" | "integrations">("watchlist");
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedMediaItem, setSelectedMediaItem] = useState<WatchlistItem | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);

  // Integrations
  const [anilistUser, setAnilistUser] = useState<AniListUser | null>(null);
  const [traktUser, setTraktUser] = useState<TraktUser | null>(null);

  // Currency & Navigation
  const [currency, setCurrency] = useState<string>("₹");
  const [expenseTab, setExpenseTab] = useState<"ledger" | "subscriptions">("ledger");

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isFetchingExpenses, setIsFetchingExpenses] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);
  const [subscriptionsLoaded, setSubscriptionsLoaded] = useState(false);
  const [investmentsLoaded, setInvestmentsLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Filters & Analytics
  const [timeFilter, setTimeFilterState] = useState<"7" | "30" | "90" | "salary" | "all">(() => {
    if (typeof window === "undefined") return "all";
    const cached = window.localStorage.getItem("phub_time_filter");
    return cached === "7" || cached === "30" || cached === "90" || cached === "salary" || cached === "all" ? cached : "all";
  });
  const [salaryDay, setSalaryDayState] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const cached = parseInt(window.localStorage.getItem("phub_salary_day") || "", 10);
    return cached >= 1 && cached <= 31 ? cached : 1;
  });
  const [monthlySalary, setMonthlySalaryState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const cached = parseFloat(window.localStorage.getItem("phub_monthly_salary") || "0");
    return isNaN(cached) ? 0 : cached;
  });
  const [additionalIncome, setAdditionalIncomeState] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const cached = parseFloat(window.localStorage.getItem("phub_additional_income") || "0");
    return isNaN(cached) ? 0 : cached;
  });
  const [reconciliations, setReconciliationsState] = useState<Record<string, number>>({});
  const [salaryLog, setSalaryLogState] = useState<Record<string, { date: string; amount: number }>>({});
  const [isProUser, setIsProUser] = useState(false);
  const [showClaimPro, setShowClaimPro] = useState(false);
  const [activeChart, setActiveChart] = useState<"category" | "trend">("category");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState("");
  const [ledgerMinAmount, setLedgerMinAmount] = useState("");
  const [ledgerMaxAmount, setLedgerMaxAmount] = useState("");
  const [ledgerSortField, setLedgerSortField] = useState<"date" | "amount" | "title" | "category">("date");
  const [ledgerSortDir, setLedgerSortDir] = useState<"asc" | "desc">("desc");

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isFetchingSubscriptions, setIsFetchingSubscriptions] = useState(false);
  const [subName, setSubName] = useState("");
  const [subIcon, setSubIcon] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCycle, setSubCycle] = useState<"monthly" | "yearly">("monthly");
  const [subNextDate, setSubNextDate] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Watchlist State
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isFetchingWatchlist, setIsFetchingWatchlist] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaType, setMediaType] = useState<"movie" | "show" | "anime" | "book">("movie");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingMedia, setIsSearchingMedia] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "anime" | "movie" | "show">("all");
  const [isEnrichingPosters, setIsEnrichingPosters] = useState(false);

  // Letterboxd RSS Sync Modal
  const [showLetterboxdModal, setShowLetterboxdModal] = useState(false);
  const [letterboxdUsername, setLetterboxdUsername] = useState("");
  const [isImportingLetterboxd, setIsImportingLetterboxd] = useState(false);

  // Data Correction
  const [isDataCorrectionOpen, setIsDataCorrectionOpen] = useState(false);

  // Book Library State
  const [bookQuery, setBookQuery] = useState("");
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookResults, setBookResults] = useState<SearchResult[]>([]);
  const [bookFilter, setBookFilter] = useState<"all" | "reading" | "to_read" | "completed">("all");
  const [isEnrichingBookCovers, setIsEnrichingBookCovers] = useState(false);

  // Investments State
  const [investments, setInvestments] = useState<InvestmentAsset[]>([]);
  const [isFetchingInvestments, setIsFetchingInvestments] = useState(false);
  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState<InvestmentCategory>("equity");
  const [invAmount, setInvAmount] = useState("");
  const [invQuantity, setInvQuantity] = useState("");
  const [invBuyPrice, setInvBuyPrice] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [invInterestRate, setInvInterestRate] = useState("");
  const [invStartDate, setInvStartDate] = useState("");
  const [invMaturityDate, setInvMaturityDate] = useState("");
  const [invCompounding, setInvCompounding] = useState<FdCompounding>("quarterly");
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [invSuggestions, setInvSuggestions] = useState<InvestmentQuote[]>([]);
  const [showInvestmentsTab, setShowInvestmentsTab] = useState(true);
  const [enableChatAssistant, setEnableChatAssistant] = useState(false);

  // Load Feature Flags
  useEffect(() => {
    fetch("/api/flags")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (typeof data.enableInvestmentPortfolios === "boolean") {
            setShowInvestmentsTab(data.enableInvestmentPortfolios);
          }
          if (typeof data.enableGeminiChatAssitant === "boolean") {
            setEnableChatAssistant(data.enableGeminiChatAssitant);
          }
        }
      })
      .catch((err) => console.error("Failed to load feature flags:", err));
  }, []);

  // Onboarding & Confirm Dialogs
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [syncPreview, setSyncPreview] = useState<SyncPreviewState>({
    isOpen: false,
    title: "",
    newItems: [],
    updatedItems: [],
    onConfirm: () => {},
  });

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "X-Client": "web",
    Authorization: `Bearer ${user?.idToken || ""}`,
  }), [user]);

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive = true,
    confirmText = "Delete",
    cancelText = "Cancel"
  ) => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDlg((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
      isDestructive,
      variant: "confirm",
    });
  };

  const triggerAlert = (
    title: string,
    message: string,
    tone: "danger" | "success" | "info" = "info",
    confirmText = "OK"
  ) => {
    setConfirmDlg({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmDlg((prev) => ({ ...prev, isOpen: false })),
      confirmText,
      variant: "alert",
      tone,
    });
  };

  /* ─── AniList / Trakt Auth ─── */
  async function loadAnilistUser(token: string) {
    try {
      const data = await anilistQuery(`query { Viewer { id name avatar { large } } }`, {}, token);
      const viewer = data.data?.Viewer;
      if (viewer) {
        setAnilistUser({ id: viewer.id, name: viewer.name, avatar: viewer.avatar?.large || null, token });
      }
    } catch (err) {
      console.error("Failed to load AniList profile:", err);
      // Fallback: stay connected but with a generic name if network fails
      setAnilistUser({ id: 0, name: "AniList User", avatar: null, token });
    }
  }

  function connectAnilist() {
    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "46468";
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=token`;
  }

  function disconnectAnilist() {
    localStorage.removeItem("anilist_token");
    setAnilistUser(null);
  }

  async function loadTraktUser(accessToken: string, refreshToken: string, idToken: string | undefined) {
    try {
      const profile = await traktRequest(idToken, "users/me?extended=full", { token: accessToken });
      if (profile?.username) {
        setTraktUser({
          username: profile.username,
          name: profile.name || profile.username,
          avatar: profile.images?.avatar?.full || null,
          accessToken,
          refreshToken,
        });
      }
    } catch (err) {
      console.error("Failed to load Trakt profile:", err);
      // Fallback: stay connected but with a generic name if network fails
      setTraktUser({
        username: "trakt_user",
        name: "Trakt User",
        avatar: null,
        accessToken,
        refreshToken,
      });
    }
  }

  function connectTrakt() {
    const clientId = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "L_cE2O_7uJ7nkzU_UDkivqetsef0OLyvpOH6o6b4Y_0";
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/trakt/callback");
    window.location.href = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  }

  function disconnectTrakt() {
    localStorage.removeItem("trakt_access_token");
    localStorage.removeItem("trakt_refresh_token");
    setTraktUser(null);
  }

  function disconnectLetterboxd() {
    localStorage.removeItem("letterboxd_username");
    setLetterboxdUsername("");
  }

  /* ─── AniList & Trakt Library Sync ─── */
  const [isSyncingAnilist, setIsSyncingAnilist] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);

  // Shared by every sync source (AniList/Trakt/Letterboxd): compares the
  // entries about to be pushed against the current watchlist so we can show
  // the user a real new-vs-updated breakdown before anything is written,
  // rather than only reporting a count after the fact.
  const describeSyncChanges = (existing: WatchlistItem, e: SyncEntry): string[] => {
    const changes: string[] = [];
    if (existing.status !== e.status) {
      changes.push(`Status: ${existing.status.replace(/_/g, " ")} → ${e.status.replace(/_/g, " ")}`);
    }
    if ((existing.progress || 0) !== (e.progress || 0)) {
      changes.push(`Progress: ${existing.progress || 0} → ${e.progress || 0}`);
    }
    if ((existing.rating ?? null) !== (e.rating ?? null)) {
      changes.push(`Rating: ${existing.rating ?? "—"} → ${e.rating ?? "—"}`);
    }
    if (!existing.coverImage && e.coverImage) {
      changes.push("Cover image added");
    }
    if (existing.year == null && e.year != null) {
      changes.push(`Year added: ${e.year}`);
    }
    return changes;
  };

  const diffSyncEntries = (entries: SyncEntry[], matchExisting: (e: SyncEntry) => WatchlistItem | undefined) => {
    const newItems: SyncPreviewItem[] = [];
    const updatedItems: SyncPreviewItem[] = [];
    for (const e of entries) {
      const existing = matchExisting(e);
      if (!existing) {
        newItems.push({ title: e.title, type: e.type, changes: [] });
        continue;
      }
      const changes = describeSyncChanges(existing, e);
      if (changes.length > 0) {
        updatedItems.push({ title: e.title, type: e.type, changes });
      }
    }
    return { newItems, updatedItems, newCount: newItems.length, updatedCount: updatedItems.length };
  };

  const syncAnilist = async () => {
    if (!anilistUser?.token) {
      connectAnilist();
      return;
    }
    setIsSyncingAnilist(true);
    try {
      const viewerData = await anilistQuery(`query { Viewer { id } }`, {}, anilistUser.token);
      const userId = viewerData?.data?.Viewer?.id;
      if (!userId) throw new Error("Could not fetch AniList profile.");

      const query = `
        query ($userId: Int) {
          MediaListCollection(userId: $userId, type: ANIME) {
            lists {
              entries {
                status
                progress
                score(format: POINT_10)
                media {
                  id
                  title { english romaji }
                  episodes
                  coverImage { large }
                  startDate { year }
                }
              }
            }
          }
        }
      `;
      const data = await anilistQuery(query, { userId }, anilistUser.token);
      const lists = data?.data?.MediaListCollection?.lists || [];
      const entries: SyncEntry[] = [];

      for (const list of lists) {
        for (const entry of list.entries || []) {
          const media = entry.media;
          if (!media) continue;

          let status: WatchlistItem["status"] = "plan_to_watch";
          if (entry.status === "CURRENT") status = "watching";
          else if (entry.status === "COMPLETED") status = "completed";
          else if (entry.status === "DROPPED") status = "dropped";
          else if (entry.status === "PAUSED") status = "paused";

          const title = media.title?.english || media.title?.romaji || "Untitled Anime";
          entries.push({
            title,
            type: "anime",
            status,
            progress: entry.progress || 0,
            totalEpisodes: media.episodes || null,
            rating: entry.score ? Number(entry.score) : null,
            coverImage: media.coverImage?.large || null,
            year: media.startDate?.year || null,
            anilistId: media.id,
          });
        }
      }

      if (entries.length === 0) {
        triggerAlert("AniList Sync", "No anime items found in your AniList account.", "info");
        return;
      }

      const { newItems, updatedItems, newCount, updatedCount } = diffSyncEntries(entries, (e) =>
        watchlist.find((w) => (w.anilistId && w.anilistId === e.anilistId) || (w.type === "anime" && w.title.toLowerCase().trim() === e.title.toLowerCase().trim()))
      );

      if (newCount === 0 && updatedCount === 0) {
        triggerAlert("AniList Sync", "Your library already matches AniList — nothing to sync.", "info");
        return;
      }

      const applyAnilistSync = async () => {
        setSyncPreview((prev) => ({ ...prev, isApplying: true }));
        setIsSyncingAnilist(true);
        try {
          const res = await fetch("/api/watchlist/sync", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ source: "anilist", entries }),
          });
          if (res.ok) {
            const result = await res.json();
            await fetchWatchlist();
            setSyncPreview((prev) => ({ ...prev, isOpen: false }));
            triggerAlert("AniList Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated anime titles!`, "success");
          } else {
            throw new Error("Server rejected sync payload.");
          }
        } catch (err: any) {
          console.error(err);
          triggerAlert("AniList Sync Error", err?.message || "Failed to sync with AniList.", "danger");
        } finally {
          setIsSyncingAnilist(false);
          setSyncPreview((prev) => ({ ...prev, isApplying: false }));
        }
      };

      setSyncPreview({ isOpen: true, title: "Sync AniList", newItems, updatedItems, onConfirm: applyAnilistSync });
    } catch (err: any) {
      console.error(err);
      triggerAlert("AniList Sync Error", err?.message || "Failed to sync with AniList.", "danger");
    } finally {
      setIsSyncingAnilist(false);
    }
  };

  const fetchOMDbPoster = async (imdbId: string | null | undefined): Promise<string | null> => {
    const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
    if (!imdbId || !apiKey) return null;
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        return data.Poster && data.Poster !== "N/A" ? data.Poster : null;
      }
    } catch (err) {
      console.error("OMDb poster error:", err);
    }
    return null;
  };

  const syncTrakt = async () => {
    if (!traktUser?.accessToken) {
      connectTrakt();
      return;
    }
    setIsSyncingTrakt(true);
    try {
      const idToken = user?.idToken;
      // 1. Fetch watched items
      const watchedMovies = await traktRequest(idToken, "sync/watched/movies", { token: traktUser.accessToken }).catch(() => []);
      const watchedShows = await traktRequest(idToken, "sync/watched/shows", { token: traktUser.accessToken }).catch(() => []);

      // 2. Fetch watchlist (plan to watch) items
      const watchlistMovies = await traktRequest(idToken, "sync/watchlist/movies", { token: traktUser.accessToken }).catch(() => []);
      const watchlistShows = await traktRequest(idToken, "sync/watchlist/shows", { token: traktUser.accessToken }).catch(() => []);

      const entries: SyncEntry[] = [];
      const processedTraktIds = new Set<number>();

      // Process watched movies
      if (Array.isArray(watchedMovies)) {
        for (const item of watchedMovies) {
          if (!item?.movie) continue;
          const traktId = item.movie.ids?.trakt;
          if (traktId) processedTraktIds.add(Number(traktId));

          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === traktId) ||
              (w.title.toLowerCase().trim() === item.movie.title.toLowerCase().trim() && w.type === "movie")
          );

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.movie.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.movie.ids.imdb);
          }

          entries.push({
            title: item.movie.title,
            type: "movie",
            status: "completed",
            progress: 1,
            totalEpisodes: 1,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.movie.year || null,
            traktId,
          });
        }
      }

      // Process watchlist movies
      if (Array.isArray(watchlistMovies)) {
        for (const item of watchlistMovies) {
          if (!item?.movie) continue;
          const traktId = item.movie.ids?.trakt;
          if (traktId && processedTraktIds.has(Number(traktId))) continue;
          if (traktId) processedTraktIds.add(Number(traktId));

          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === traktId) ||
              (w.title.toLowerCase().trim() === item.movie.title.toLowerCase().trim() && w.type === "movie")
          );

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.movie.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.movie.ids.imdb);
          }

          entries.push({
            title: item.movie.title,
            type: "movie",
            status: existing?.status === "dropped" ? "dropped" : existing?.status === "paused" ? "paused" : "plan_to_watch",
            progress: 0,
            totalEpisodes: 1,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.movie.year || null,
            traktId,
          });
        }
      }

      // Process watched shows
      if (Array.isArray(watchedShows)) {
        for (const item of watchedShows) {
          if (!item?.show) continue;
          const traktId = item.show.ids?.trakt;
          if (traktId) processedTraktIds.add(Number(traktId));
          
          let progress = 0;
          if (Array.isArray(item.seasons)) {
            for (const season of item.seasons) {
              if (Array.isArray(season.episodes)) {
                progress += season.episodes.length;
              }
            }
          }
          if (progress === 0 && item.plays) {
            progress = item.plays;
          }

          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === traktId) ||
              (w.title.toLowerCase().trim() === item.show.title.toLowerCase().trim() && w.type === "show")
          );

          let totalEpisodes = existing?.totalEpisodes || null;
          if (!totalEpisodes && traktId) {
            try {
              const showDetails = await traktRequest(idToken, `shows/${traktId}?extended=full`, { token: traktUser.accessToken });
              if (showDetails?.aired_episodes) {
                totalEpisodes = Number(showDetails.aired_episodes);
              }
            } catch (err) {
              console.error("Failed to fetch show episode count:", err);
            }
          }

          let status: WatchlistItem["status"] = "watching";
          if (totalEpisodes && totalEpisodes > 0 && progress >= totalEpisodes) {
            status = "completed";
          } else if (!totalEpisodes && existing?.status === "completed" && progress >= (existing.progress || 0)) {
            status = "completed";
          } else if (existing?.status === "dropped" && progress <= (existing.progress || 0)) {
            status = "dropped";
          } else if (existing?.status === "paused" && progress <= (existing.progress || 0)) {
            status = "paused";
          }

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.show.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.show.ids.imdb);
          }
          // TVMaze fallback for TV shows
          if (!coverImage && item.show.ids?.imdb) {
            try {
              const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${item.show.ids.imdb}`);
              if (tvmazeRes.ok) {
                const tvmazeData = await tvmazeRes.json();
                coverImage = tvmazeData.image?.medium || null;
              }
            } catch (err) {
              console.error("TVMaze fallback error:", err);
            }
          }

          entries.push({
            title: item.show.title,
            type: "show",
            status,
            progress,
            totalEpisodes,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.show.year || null,
            traktId,
          });
        }
      }

      // Process watchlist shows
      if (Array.isArray(watchlistShows)) {
        for (const item of watchlistShows) {
          if (!item?.show) continue;
          const traktId = item.show.ids?.trakt;
          if (traktId && processedTraktIds.has(Number(traktId))) continue;
          if (traktId) processedTraktIds.add(Number(traktId));

          const existing = watchlist.find(
            (w) =>
              (w.traktId && w.traktId === traktId) ||
              (w.title.toLowerCase().trim() === item.show.title.toLowerCase().trim() && w.type === "show")
          );

          let coverImage = existing?.coverImage || null;
          if (!coverImage && item.show.ids?.imdb) {
            coverImage = await fetchOMDbPoster(item.show.ids.imdb);
          }
          if (!coverImage && item.show.ids?.imdb) {
            try {
              const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${item.show.ids.imdb}`);
              if (tvmazeRes.ok) {
                const tvmazeData = await tvmazeRes.json();
                coverImage = tvmazeData.image?.medium || null;
              }
            } catch (err) {
              console.error("TVMaze fallback error:", err);
            }
          }

          entries.push({
            title: item.show.title,
            type: "show",
            status: existing?.status === "dropped" ? "dropped" : existing?.status === "paused" ? "paused" : "plan_to_watch",
            progress: 0,
            totalEpisodes: existing?.totalEpisodes || null,
            rating: item.rating ? Number(item.rating) : null,
            coverImage,
            year: item.show.year || null,
            traktId,
          });
        }
      }

      if (entries.length === 0) {
        triggerAlert("Trakt Sync", "No watched items found in your Trakt account.", "info");
        return;
      }

      const { newItems, updatedItems, newCount, updatedCount } = diffSyncEntries(entries, (e) =>
        watchlist.find((w) => w.type === e.type && ((w.traktId && w.traktId === e.traktId) || w.title.toLowerCase().trim() === e.title.toLowerCase().trim()))
      );

      if (newCount === 0 && updatedCount === 0) {
        triggerAlert("Trakt Sync", "Your library already matches Trakt — nothing to sync.", "info");
        return;
      }

      const applyTraktSync = async () => {
        setSyncPreview((prev) => ({ ...prev, isApplying: true }));
        setIsSyncingTrakt(true);
        try {
          const res = await fetch("/api/watchlist/sync", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ source: "trakt", entries }),
          });
          if (res.ok) {
            const result = await res.json();
            await fetchWatchlist();
            setSyncPreview((prev) => ({ ...prev, isOpen: false }));
            triggerAlert("Trakt Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated movies & shows!`, "success");
          } else {
            throw new Error("Server rejected sync payload.");
          }
        } catch (err: any) {
          console.error(err);
          triggerAlert("Trakt Sync Error", err?.message || "Failed to sync with Trakt.", "danger");
        } finally {
          setIsSyncingTrakt(false);
          setSyncPreview((prev) => ({ ...prev, isApplying: false }));
        }
      };

      setSyncPreview({ isOpen: true, title: "Sync Trakt", newItems, updatedItems, onConfirm: applyTraktSync });
    } catch (err: any) {
      console.error(err);
      triggerAlert("Trakt Sync Error", err?.message || "Failed to sync with Trakt.", "danger");
    } finally {
      setIsSyncingTrakt(false);
    }
  };

  const enrichMissingPosters = async () => {
    const missing = watchlist.filter(
      (w) => !w.coverImage && (w.type === "movie" || w.type === "show")
    );
    if (missing.length === 0) {
      triggerAlert("All Good", "All your movies and shows already have cover images!", "success");
      return;
    }

    triggerConfirm(
      "Fetch Missing Posters",
      `Found ${missing.length} items with missing cover art. Fetch them now from OMDb/TVMaze?`,
      async () => {
        setIsEnrichingPosters(true);
        let successCount = 0;
        try {
          const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
          for (const item of missing) {
            let imdbId = null;
            
            // 1. Try to resolve IMDb ID from Trakt if available
            if (item.traktId) {
              try {
                const details = await traktRequest(user?.idToken, `${item.type}s/${item.traktId}`);
                imdbId = details?.ids?.imdb || null;
              } catch (e) {
                console.error("Trakt details fetch error:", e);
              }
            }

            // 2. Fetch from OMDb
            let coverImage = null;
            if (apiKey) {
              try {
                const searchUrl = imdbId 
                  ? `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`
                  : `https://www.omdbapi.com/?t=${encodeURIComponent(item.title)}&y=${item.year || ""}&apikey=${apiKey}`;
                const omdbRes = await fetch(searchUrl);
                if (omdbRes.ok) {
                  const omdbData = await omdbRes.json();
                  coverImage = omdbData.Poster && omdbData.Poster !== "N/A" ? omdbData.Poster : null;
                }
              } catch (e) {
                console.error("OMDb search error:", e);
              }
            }

            // 3. Fallback to TVMaze for TV shows
            if (!coverImage && item.type === "show") {
              try {
                const searchUrl = imdbId
                  ? `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`
                  : `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`;
                const tvmazeRes = await fetch(searchUrl);
                if (tvmazeRes.ok) {
                  const tvmazeData = await tvmazeRes.json();
                  coverImage = tvmazeData.image?.medium || null;
                }
              } catch (e) {
                console.error("TVMaze fallback error:", e);
              }
            }

            // 4. Update the item in Firestore if a cover was found
            if (coverImage) {
              const res = await fetch(`/api/watchlist/${item.id}`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({ coverImage }),
              });
              if (res.ok) {
                successCount++;
              }
            }
          }

          if (successCount > 0) {
            await fetchWatchlist();
            triggerAlert("Enrichment Complete", `Successfully updated ${successCount} items with cover art!`, "success");
          } else {
            triggerAlert("Enrichment Complete", "Could not find any posters for the missing items.", "info");
          }
        } catch (err: any) {
          console.error("Enrichment error:", err);
          triggerAlert("Enrichment Error", err.message || "Failed to enrich posters.", "danger");
        } finally {
          setIsEnrichingPosters(false);
        }
      }
    );
  };

  const enrichMissingBookCovers = async () => {
    const missing = watchlist.filter((w) => w.type === "book" && !w.coverImage);
    if (missing.length === 0) {
      triggerAlert("All Good", "All your books already have cover images!", "success");
      return;
    }

    triggerConfirm(
      "Fetch Missing Covers",
      `Found ${missing.length} book${missing.length === 1 ? "" : "s"} with missing cover art. Fetch them now from OpenLibrary?`,
      async () => {
        setIsEnrichingBookCovers(true);
        let successCount = 0;
        try {
          for (const item of missing) {
            let coverImage: string | null = null;
            try {
              const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(item.title)}&limit=1`;
              const res = await fetch(searchUrl);
              if (res.ok) {
                const data = await res.json();
                const doc = data.docs?.[0];
                coverImage = doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null;
              }
            } catch (e) {
              console.error("OpenLibrary search error:", e);
            }

            if (coverImage) {
              const res = await fetch(`/api/watchlist/${item.id}`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({ coverImage }),
              });
              if (res.ok) successCount++;
            }
          }

          if (successCount > 0) {
            await fetchWatchlist();
            triggerAlert("Enrichment Complete", `Successfully updated ${successCount} book${successCount === 1 ? "" : "s"} with cover art!`, "success");
          } else {
            triggerAlert("Enrichment Complete", "Could not find any covers for the missing books.", "info");
          }
        } catch (err: any) {
          console.error("Book cover enrichment error:", err);
          triggerAlert("Enrichment Error", err.message || "Failed to enrich book covers.", "danger");
        } finally {
          setIsEnrichingBookCovers(false);
        }
      }
    );
  };

  /* ─── Handle OAuth Tokens & Firebase Auth ─── */
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const anilistToken = params.get("access_token");
    const traktAccessToken = params.get("trakt_access_token");
    const traktRefreshToken = params.get("trakt_refresh_token");

    if (anilistToken) {
      localStorage.setItem("anilist_token", anilistToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (traktAccessToken && traktRefreshToken) {
      localStorage.setItem("trakt_access_token", traktAccessToken);
      localStorage.setItem("trakt_refresh_token", traktRefreshToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    // Init Firebase Auth
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      const res = await fetch("/api/auth/config");
      const config = await res.json();
      const app = getApps().length ? getApps()[0] : initializeApp(config);

      const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, getRedirectResult } = await import("firebase/auth");
      const auth = getAuth(app);
      setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut });

      getRedirectResult(auth).then((result) => {
        if (result?.user) {
          console.log("[Auth] Redirect sign-in consumed:", result.user.email);
        }
      }).catch((err) => {
        console.warn("[Auth] getRedirectResult error:", err?.code, err?.message);
      });

      unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
        if (fbUser) {
          const idToken = await fbUser.getIdToken();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            idToken,
          });
        } else {
          setUser(null);
        }
        setAuthLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /* ─── Handle Integrations Profile Load ─── */
  useEffect(() => {
    if (!user) return;
    const aniToken = localStorage.getItem("anilist_token");
    if (aniToken) loadAnilistUser(aniToken);

    const trAcc = localStorage.getItem("trakt_access_token");
    const trRef = localStorage.getItem("trakt_refresh_token");
    if (trAcc && trRef) loadTraktUser(trAcc, trRef, user.idToken);

    const lbUser = localStorage.getItem("letterboxd_username");
    if (lbUser) setLetterboxdUsername(lbUser);
  }, [user]);

  /* ─── API Fetchers ─── */
  const fetchExpenses = async () => {
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
  };

  const fetchWatchlist = async () => {
    setIsFetchingWatchlist(true);
    try {
      const res = await fetch("/api/watchlist", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingWatchlist(false);
      setWatchlistLoaded(true);
    }
  };

  const fetchSubscriptions = async () => {
    setIsFetchingSubscriptions(true);
    try {
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (res.ok) {
        const loaded = (await res.json()) as any[];
        const rolled = loaded.map((sub) => {
          const futureDate = getNextFutureBillingDate(sub.nextBillingDate, sub.billingCycle);
          if (futureDate !== sub.nextBillingDate) {
            fetch(`/api/subscriptions/${sub.id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ nextBillingDate: futureDate }),
            }).catch((e) => console.error(e));
            return { ...sub, nextBillingDate: futureDate };
          }
          return sub;
        });
        setSubscriptions(rolled);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingSubscriptions(false);
      setSubscriptionsLoaded(true);
    }
  };

  const fetchInvestments = async () => {
    setIsFetchingInvestments(true);
    try {
      const res = await fetch("/api/portfolio", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.assets) ? data.assets : []);
        setInvestments(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingInvestments(false);
      setInvestmentsLoaded(true);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.timeFilter) {
          setTimeFilterState(data.timeFilter);
          localStorage.setItem("phub_time_filter", data.timeFilter);
        }
        if (data.salaryDay) {
          setSalaryDayState(data.salaryDay);
          localStorage.setItem("phub_salary_day", String(data.salaryDay));
        }
        if (data.monthlySalary !== undefined) {
          setMonthlySalaryState(data.monthlySalary);
          localStorage.setItem("phub_monthly_salary", String(data.monthlySalary));
        }
        if (data.additionalIncome !== undefined) {
          setAdditionalIncomeState(data.additionalIncome);
          localStorage.setItem("phub_additional_income", String(data.additionalIncome));
        }
        if (data.reconciliations && typeof data.reconciliations === "object") {
          setReconciliationsState(data.reconciliations);
        }
        if (data.salaryLog && typeof data.salaryLog === "object") {
          setSalaryLogState(data.salaryLog);
        }
        setIsProUser(data.isPro === true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const setTimeFilter = (f: "7" | "30" | "90" | "salary" | "all") => {
    setTimeFilterState(f);
    localStorage.setItem("phub_time_filter", f);
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ timeFilter: f }) }).catch((err) => console.error(err));
    }
  };

  const setSalaryDay = (d: number) => {
    setSalaryDayState(d);
    localStorage.setItem("phub_salary_day", String(d));
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ salaryDay: d }) }).catch((err) => console.error(err));
    }
  };

  const setMonthlySalary = (val: number) => {
    setMonthlySalaryState(val);
    localStorage.setItem("phub_monthly_salary", String(val));
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ monthlySalary: val }) }).catch((err) => console.error(err));
    }
  };

  const setAdditionalIncome = (val: number) => {
    setAdditionalIncomeState(val);
    localStorage.setItem("phub_additional_income", String(val));
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ additionalIncome: val }) }).catch((err) => console.error(err));
    }
  };

  const setReconciliation = (cycleStartDate: string, actualAmount: number) => {
    const next = { ...reconciliations, [cycleStartDate]: actualAmount };
    setReconciliationsState(next);
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ reconciliations: next }) }).catch((err) => console.error(err));
    }
  };

  const setSalaryLogEntry = (date: string, amount: number) => {
    const next = { ...salaryLog, [date]: { date, amount } };
    setSalaryLogState(next);
    if (user) {
      fetch("/api/settings", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ salaryLog: next }) }).catch((err) => console.error(err));
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchWatchlist();
      fetchSubscriptions();
      fetchInvestments();
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    const handleWatchlistUpdate = () => {
      fetchWatchlist();
    };
    window.addEventListener("watchlist-updated", handleWatchlistUpdate);
    return () => window.removeEventListener("watchlist-updated", handleWatchlistUpdate);
  }, [user]);

  /* ─── Onboarding Guide Check ─── */
  useEffect(() => {
    if (!user || !expensesLoaded) return;
    if (localStorage.getItem("phub_onboarding_seen")) return;
    localStorage.setItem("phub_onboarding_seen", "1");

    const hasIntegration = !!localStorage.getItem("anilist_token") || !!localStorage.getItem("trakt_access_token");
    if (expenses.length === 0 && !hasIntegration) {
      setShowOnboarding(true);
    }
  }, [user, expensesLoaded, expenses.length]);

  /* ─── Expense Actions ─── */
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    setIsAddingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: expenseTitle.trim(),
          amount: parseFloat(expenseAmount),
          category: expenseCategory || null,
          date: expenseDate || toLocalDateStr(new Date()),
          notes: expenseNotes.trim() || null,
        }),
      });
      if (res.ok) {
        setExpenseTitle("");
        setExpenseAmount("");
        setExpenseCategory("");
        setExpenseNotes("");
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingExpense(false);
    }
  };

  const logUnaccountedGap = async (amount: number) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: "Unaccounted spending (reconciliation gap)",
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

  const deleteExpense = async (id: string) => {
    triggerConfirm("Archive Expense", "Are you sure you want to archive this expense?", async () => {
      const previousList = [...expenses];
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      try {
        const res = await fetch(`/api/expenses/${id}`, { method: "DELETE", headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to archive expense");
      } catch (err) {
        console.error(err);
        setExpenses(previousList);
      }
    });
  };

  /* ─── Subscription Actions ─── */
  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !subCost || !subNextDate) return;
    setIsAddingSub(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: subName.trim(),
          cost: parseFloat(subCost),
          billingCycle: subCycle,
          nextBillingDate: subNextDate,
          icon: subIcon.trim() || null,
        }),
      });
      if (res.ok) {
        setSubName("");
        setSubCost("");
        setSubIcon("");
        fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingSub(false);
    }
  };

  const deleteSubscription = async (id: string) => {
    triggerConfirm("Delete Subscription", "Are you sure you want to delete this subscription?", async () => {
      const previousList = [...subscriptions];
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      try {
        const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to delete subscription");
      } catch (err) {
        console.error(err);
        setSubscriptions(previousList);
      }
    });
  };

  const updateSubscriptionIcon = async (id: string, icon: string) => {
    const nextIcon = icon.trim() || null;
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, icon: nextIcon } : s)));
    try {
      await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ icon: nextIcon }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error(err);
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    }
  };

  const logSubscriptionExpense = async (sub: Subscription) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: `${sub.name} Payment`,
          amount: sub.cost,
          category: sub.name.toLowerCase().includes("rent") ? "Rent" : "Subscriptions",
          date: toLocalDateStr(new Date()),
          notes: `Logged automatically from subscription: ${sub.name}`,
        }),
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const importExpensesBatch = async (items: any[]) => {
    const chunks = [];
    const chunkSize = 100;
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }

    let totalAdded = 0;
    for (const chunk of chunks) {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to import batch chunk");
      }
      const data = await res.json();
      totalAdded += data.added || 0;
    }

    fetchExpenses();
    return totalAdded;
  };

  /* ─── Watchlist Actions ─── */
  const updateWatchItem = async (item: WatchlistItem, updates: Partial<WatchlistItem>) => {
    const nextUpdates = { ...updates };
    if (nextUpdates.progress !== undefined) {
      const total = nextUpdates.totalEpisodes !== undefined && nextUpdates.totalEpisodes !== null
        ? Number(nextUpdates.totalEpisodes)
        : (item.totalEpisodes !== undefined && item.totalEpisodes !== null ? Number(item.totalEpisodes) : null);
      
      if (total && total > 0 && Number(nextUpdates.progress) >= total) {
        nextUpdates.status = "completed";
      } else if (total && total > 0 && Number(nextUpdates.progress) < total && item.status === "completed" && nextUpdates.status === undefined) {
        nextUpdates.status = "watching";
      }
    }

    const res = await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(nextUpdates),
    });
    if (res.ok) {
      setWatchlist((prev) => prev.map((w) => (w.id === item.id ? { ...w, ...nextUpdates, updatedAt: Date.now() } : w)));
      pushWatchlistUpdate(user?.idToken, item, nextUpdates).catch((err) => console.error(err));
    }
  };

  const deleteWatchItem = async (id: string) => {
    triggerConfirm("Delete Watchlist Item", "Are you sure you want to remove this item from your watchlist?", async () => {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE", headers: getHeaders() });
      if (res.ok) setWatchlist((prev) => prev.filter((w) => w.id !== id));
    });
  };

  const searchMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaQuery.trim()) return;
    setIsSearchingMedia(true);
    setSearchResults([]);
    try {
      if (mediaType === "anime") {
        const data = await anilistQuery(
          `query($s:String){Page(perPage:8){media(search:$s,type:ANIME){id title{english romaji}coverImage{large}startDate{year}episodes}}}`,
          { s: mediaQuery }
        );
        setSearchResults(
          (data.data?.Page?.media || []).map((m: any) => ({
            title: m.title.english || m.title.romaji,
            type: "anime",
            totalEpisodes: m.episodes || null,
            coverImage: m.coverImage?.large || null,
            year: m.startDate?.year || null,
            anilistId: m.id,
          }))
        );
      } else {
        const data = await traktRequest(user?.idToken, `search/${mediaType}?query=${encodeURIComponent(mediaQuery)}&limit=8`);
        if (Array.isArray(data)) {
          const enrichedResults = await Promise.all(
            data.map(async (item: any) => {
              const m = item.movie || item.show;
              const imdbId = m.ids?.imdb;
              let coverImage = null;
              if (imdbId) {
                coverImage = await fetchOMDbPoster(imdbId);
              }
              if (!coverImage && item.type === "show" && imdbId) {
                try {
                  const tvmazeRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
                  if (tvmazeRes.ok) {
                    const tvmazeData = await tvmazeRes.json();
                    coverImage = tvmazeData.image?.medium || null;
                  }
                } catch (err) {
                  console.error("TVMaze fallback error:", err);
                }
              }
              return {
                title: m.title,
                type: (item.type === "movie" ? "movie" : "show") as "movie" | "show",
                totalEpisodes: item.type === "show" ? m.aired_episodes || null : null,
                coverImage,
                year: m.year || null,
                traktId: m.ids?.trakt || null,
              };
            })
          );
          setSearchResults(enrichedResults);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMedia(false);
    }
  };

  const addToWatchlist = async (res: SearchResult) => {
    const body: Omit<WatchlistItem, "id" | "updatedAt" | "createdAt"> = {
      title: res.title,
      type: res.type,
      status: "plan_to_watch",
      progress: 0,
      totalEpisodes: res.totalEpisodes || null,
      rating: null,
      coverImage: res.coverImage || null,
      year: res.year || null,
      anilistId: res.anilistId || null,
      traktId: res.traktId || null,
    };
    const apiRes = await fetch("/api/watchlist", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (apiRes.ok) {
      fetchWatchlist();
      const createdItem = { ...body, id: "" } as WatchlistItem;
      pushWatchlistUpdate(user?.idToken, createdItem, { status: "plan_to_watch" }).catch((e) => console.error(e));
    }
  };

  const handleLetterboxdImport = async () => {
    if (!letterboxdUsername.trim()) return;
    setIsImportingLetterboxd(true);
    try {
      const res = await fetch(`/api/watchlist/letterboxd?username=${encodeURIComponent(letterboxdUsername.trim())}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to fetch Letterboxd RSS feed.");
      }

      const { movies } = await res.json();
      if (!movies || movies.length === 0) {
        throw new Error("No recent watched diary entries found in this Letterboxd feed.");
      }

      const { newItems, updatedItems, newCount, updatedCount } = diffSyncEntries(movies, (e) =>
        watchlist.find((w) => w.type === "movie" && ((w.traktId && e.traktId && w.traktId === e.traktId) || w.title.toLowerCase().trim() === e.title.toLowerCase().trim()))
      );

      if (newCount === 0 && updatedCount === 0) {
        triggerAlert("Letterboxd Sync", "Your library already matches this Letterboxd feed — nothing to sync.", "info");
        return;
      }

      const applyLetterboxdSync = async () => {
        setSyncPreview((prev) => ({ ...prev, isApplying: true }));
        setIsImportingLetterboxd(true);
        try {
          const syncRes = await fetch("/api/watchlist/sync", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ source: "letterboxd", entries: movies }),
          });
          if (syncRes.ok) {
            const result = await syncRes.json();
            setShowLetterboxdModal(false);
            localStorage.setItem("letterboxd_username", letterboxdUsername.trim());
            fetchWatchlist();
            setSyncPreview((prev) => ({ ...prev, isOpen: false }));
            triggerAlert("Letterboxd Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated movies!`, "success");
          } else {
            throw new Error("Server rejected sync payload.");
          }
        } catch (err: any) {
          triggerAlert("Sync Failed", err?.message || "Failed to sync Letterboxd feed.", "danger");
        } finally {
          setIsImportingLetterboxd(false);
          setSyncPreview((prev) => ({ ...prev, isApplying: false }));
        }
      };

      setSyncPreview({ isOpen: true, title: "Sync Letterboxd", newItems, updatedItems, onConfirm: applyLetterboxdSync });
    } catch (err: any) {
      triggerAlert("Sync Failed", err?.message || "Failed to parse RSS feed", "danger");
    } finally {
      setIsImportingLetterboxd(false);
    }
  };

  /* ─── Book Library Actions ─── */
  const searchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookQuery.trim()) return;
    setIsSearchingBooks(true);
    setBookResults([]);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setBookResults(
          (data.docs || []).map((doc: any) => ({
            title: doc.title,
            type: "book",
            totalEpisodes: doc.number_of_pages_median || null,
            coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
            year: doc.first_publish_year || null,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const addBook = async (b: SearchResult) => {
    const body: Omit<WatchlistItem, "id" | "updatedAt" | "createdAt"> = {
      title: b.title,
      type: "book",
      status: "plan_to_watch",
      progress: 0,
      totalEpisodes: b.totalEpisodes || null,
      rating: null,
      coverImage: b.coverImage || null,
      year: b.year || null,
    };
    const apiRes = await fetch("/api/watchlist", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (apiRes.ok) fetchWatchlist();
  };

  /* ─── Investments Actions ─── */
  useEffect(() => {
    if (!invName.trim() || !TICKER_SEARCH_CATEGORIES.includes(invCategory)) {
      setInvSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portfolio/search?q=${encodeURIComponent(invName)}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setInvSuggestions(data.quotes || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [invName, invCategory, user]);

  const selectSuggestion = (s: InvestmentQuote) => {
    setInvName(s.symbol || s.name || "");
    if (invCategory === "equity" || invCategory === "crypto" || invCategory === "mutual_fund") {
      if (s.type === "EQUITY") setInvCategory("equity");
      else if (s.type === "CRYPTOCURRENCY") setInvCategory("crypto");
      else if (s.type === "MUTUALFUND") setInvCategory("mutual_fund");
    }
    setInvSuggestions([]);
  };

  const addInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || !invAmount) return;
    if (invCategory === "fixed_deposit" && (!invInterestRate || !invStartDate || !invMaturityDate)) return;
    setIsAddingAsset(true);
    try {
      const newAsset =
        invCategory === "fixed_deposit"
          ? {
              name: invName.trim(),
              category: invCategory,
              amount: parseFloat(invAmount),
              investedAmount: parseFloat(invAmount),
              interestRate: parseFloat(invInterestRate),
              startDate: invStartDate,
              maturityDate: invMaturityDate,
              compounding: invCompounding,
              notes: invNotes.trim() || undefined,
            }
          : {
              name: invName.trim(),
              category: invCategory,
              amount: parseFloat(invAmount),
              investedAmount: parseFloat(invAmount),
              quantity: invQuantity ? parseFloat(invQuantity) : undefined,
              buyPrice: invBuyPrice ? parseFloat(invBuyPrice) : undefined,
              notes: invNotes.trim() || undefined,
            };
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          assets: [...investments, newAsset],
        }),
      });
      if (res.ok) {
        setInvName("");
        setInvAmount("");
        setInvQuantity("");
        setInvBuyPrice("");
        setInvNotes("");
        setInvInterestRate("");
        setInvStartDate("");
        setInvMaturityDate("");
        fetchInvestments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingAsset(false);
    }
  };

  const deleteInvestment = async (id: string) => {
    triggerConfirm("Delete Asset", "Are you sure you want to delete this asset from your portfolio?", async () => {
      const previousList = [...investments];
      const updatedList = investments.filter((a) => a.id !== id);
      setInvestments(updatedList);
      try {
        const res = await fetch(`/api/portfolio/${id}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Failed to delete asset");
      } catch (err) {
        console.error(err);
        setInvestments(previousList);
      }
    });
  };

  const sellInvestment = async (id: string, soldPrice: number) => {
    const previousList = [...investments];
    const now = Date.now();
    const updatedList = investments.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          isSold: true,
          soldAt: now,
          soldPrice: soldPrice,
          amount: 0,
        };
      }
      return a;
    });
    setInvestments(updatedList);
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          isSold: true,
          soldAt: now,
          soldPrice: soldPrice,
          amount: 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update asset");
    } catch (err) {
      console.error(err);
      setInvestments(previousList);
    }
  };

  const updateMarketPrices = async () => {
    setIsUpdatingPrices(true);
    try {
      const res = await fetch("/api/portfolio/prices", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ assets: investments, forceRefresh: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const pricedAssets = (data.assets || []).map((a: any) => {
          const liveValue =
            a.quantity && a.currentPriceInr
              ? a.quantity * a.currentPriceInr
              : a.amount;
          return { ...a, amount: liveValue };
        });

        const saveRes = await fetch("/api/portfolio", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ assets: pricedAssets }),
        });
        if (saveRes.ok) fetchInvestments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  /* ─── Calculated Expense Analytics ─── */
  const allCategories = useMemo(() => {
    const defaultCats = ["Food", "Transport", "Entertainment", "Shopping", "Groceries", "Utilities", "Drinks", "Home", "Health", "Other"];
    const loadedCats = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) loadedCats.add(e.category);
    });
    customCategories.forEach((c) => loadedCats.add(c));
    return Array.from(new Set([...defaultCats, ...Array.from(loadedCats)]));
  }, [expenses, customCategories]);

  const filteredExpensesBase = useMemo(() => {
    let list = expenses;

    if (timeFilter !== "all") {
      const now = new Date();
      if (timeFilter === "salary") {
        const { startStr, endStr } = resolvePayCycle(salaryDay, salaryLog);
        list = list.filter((e) => e.date && e.date >= startStr && e.date <= endStr);
      } else {
        const days = parseInt(timeFilter, 10);
        const cutoff = toLocalDateStr(new Date(now.getTime() - days * 86400000));
        list = list.filter((e) => e.date && e.date >= cutoff);
      }
    }

    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)));
    }

    if (ledgerMinAmount) {
      const min = parseFloat(ledgerMinAmount);
      if (!isNaN(min)) list = list.filter((e) => (e.amount || 0) >= min);
    }
    if (ledgerMaxAmount) {
      const max = parseFloat(ledgerMaxAmount);
      if (!isNaN(max)) list = list.filter((e) => (e.amount || 0) <= max);
    }

    return list;
  }, [expenses, timeFilter, salaryDay, salaryLog, expenseSearch, ledgerMinAmount, ledgerMaxAmount]);

  const filteredExpenses = useMemo(() => {
    let list = filteredExpensesBase;

    if (ledgerCategoryFilter) {
      list = list.filter((e) => e.category === ledgerCategoryFilter);
    }

    const dir = ledgerSortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (ledgerSortField) {
        case "amount":
          return ((a.amount || 0) - (b.amount || 0)) * dir;
        case "title":
          return a.title.localeCompare(b.title) * dir;
        case "category":
          return (a.category || "").localeCompare(b.category || "") * dir;
        case "date":
        default:
          return (a.date || "").localeCompare(b.date || "") * dir;
      }
    });

    return list;
  }, [filteredExpensesBase, ledgerCategoryFilter, ledgerSortField, ledgerSortDir]);

  const totalSpent = useMemo(() => filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0), [filteredExpenses]);

  const CYCLE_HISTORY_DEPTH = 7;
  const cycleHistoryRaw = useMemo(
    () => buildCycleHistory(salaryDay, salaryLog, CYCLE_HISTORY_DEPTH),
    [salaryDay, salaryLog]
  );

  const payCycle = useMemo(() => {
    const { startStr, endStr, loggedAmount, prevStartStr, prevEndStr } = resolvePayCycle(salaryDay, salaryLog);
    const todayStr = toLocalDateStr(new Date());
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);

    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const elapsedDays = Math.min(totalDays, Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1));
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const cycleExpensesSoFar = expenses.filter((e) => e.date && e.date >= startStr && e.date <= todayStr);
    const spentSoFar = cycleExpensesSoFar.reduce((acc, e) => acc + (e.amount || 0), 0);

    const subMonthlyCost = subscriptions.reduce((acc, sub) => {
      let cost = sub.cost || 0;
      if (sub.billingCycle === "yearly") cost = cost / 12;
      return acc + cost;
    }, 0);

    const prevCycleExpenses = expenses.filter((e) => e.date && e.date >= prevStartStr && e.date <= prevEndStr);
    const prevSameDayEnd = new Date(`${prevStartStr}T00:00:00`);
    prevSameDayEnd.setDate(prevSameDayEnd.getDate() + elapsedDays - 1);
    const prevSameDayEndStr = toLocalDateStr(prevSameDayEnd);
    const prevCycleSpendToSameDay = prevCycleExpenses
      .filter((e) => e.date! <= prevSameDayEndStr)
      .reduce((acc, e) => acc + (e.amount || 0), 0);
    const prevCycleTransactional = prevCycleExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const prevCycleSpend = prevCycleTransactional + subMonthlyCost;

    const BLACKOUT_DAYS = 2;
    const WARMUP_DAYS = 7;
    const paceConfidence = Math.max(0, Math.min(1, (elapsedDays - BLACKOUT_DAYS) / WARMUP_DAYS));
    const dailyPace = elapsedDays > 0 ? spentSoFar / elapsedDays : 0;
    const paceProjectedTransactional = dailyPace * totalDays;

    const HISTORY_CYCLES_FOR_BASELINE = 3;
    const pastCyclesSpend = cycleHistoryRaw
      .slice(1, 1 + HISTORY_CYCLES_FOR_BASELINE)
      .map((c) => expenses.filter((e) => e.date && e.date >= c.startStr && e.date <= c.endStr).reduce((acc, e) => acc + (e.amount || 0), 0))
      .filter((v) => v > 0);
    const historicalBaselineTransactional =
      pastCyclesSpend.length > 0 ? pastCyclesSpend.reduce((a, b) => a + b, 0) / pastCyclesSpend.length : prevCycleTransactional;

    const projectedTransactional =
      historicalBaselineTransactional > 0
        ? paceConfidence * paceProjectedTransactional + (1 - paceConfidence) * historicalBaselineTransactional
        : paceProjectedTransactional;

    const hasLedgerHistory = historicalBaselineTransactional > 0 || spentSoFar > 0;
    const projectedTotalSpend = hasLedgerHistory ? projectedTransactional : subMonthlyCost;

    const salaryThisCycle = loggedAmount ?? monthlySalary;
    const totalIncome = salaryThisCycle + additionalIncome;
    const expectedCashOnHand = totalIncome - spentSoFar;
    const expectedSavings = totalIncome - projectedTotalSpend;
    const savingsRate = totalIncome > 0 ? (expectedSavings / totalIncome) * 100 : 0;

    const paceDeltaPct = prevCycleSpend > 0 ? ((projectedTotalSpend - prevCycleSpend) / prevCycleSpend) * 100 : null;

    const cycleCatBreakdown: Record<string, number> = {};
    cycleExpensesSoFar.forEach((e) => {
      const cat = e.category || "Uncategorized";
      cycleCatBreakdown[cat] = (cycleCatBreakdown[cat] || 0) + (e.amount || 0);
    });

    return {
      startStr,
      endStr,
      totalDays,
      elapsedDays,
      remainingDays,
      spentSoFar,
      subMonthlyCost,
      projectedTotalSpend,
      committedSpend: subMonthlyCost,
      projectedRemaining: Math.max(0, projectedTotalSpend - spentSoFar),
      paceConfidence,
      totalIncome,
      isSalaryLogged: loggedAmount !== null,
      expectedCashOnHand,
      expectedSavings,
      savingsRate,
      prevCycleSpend,
      prevCycleSpendToSameDay,
      paceDeltaPct,
      cycleCatBreakdown: Object.fromEntries(Object.entries(cycleCatBreakdown).sort(([, a], [, b]) => b - a)) as Record<string, number>,
    };
  }, [expenses, subscriptions, salaryDay, salaryLog, monthlySalary, additionalIncome, cycleHistoryRaw]);

  const cycleHistory = useMemo(() => {
    return cycleHistoryRaw
      .slice(1)
      .map((c) => {
        const cycleExpenses = expenses.filter((e) => e.date && e.date >= c.startStr && e.date <= c.endStr);
        const transactional = cycleExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        const spend = transactional + payCycle.subMonthlyCost;
        const income = (c.loggedAmount ?? monthlySalary) + additionalIncome;
        return {
          startStr: c.startStr,
          endStr: c.endStr,
          income,
          spend,
          savings: income - spend,
          isSalaryLogged: c.loggedAmount !== null,
          hasData: cycleExpenses.length > 0 || c.loggedAmount !== null,
        };
      })
      .filter((c) => c.hasData);
  }, [cycleHistoryRaw, expenses, monthlySalary, additionalIncome, payCycle.subMonthlyCost]);

  const cycleAverages = useMemo(() => {
    if (cycleHistory.length === 0) return null;
    const avgIncome = cycleHistory.reduce((a, c) => a + c.income, 0) / cycleHistory.length;
    const avgSpend = cycleHistory.reduce((a, c) => a + c.spend, 0) / cycleHistory.length;
    const avgSavings = avgIncome - avgSpend;
    return {
      avgIncome,
      avgSpend,
      avgSavings,
      avgSavingsRate: avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0,
      cycleCount: cycleHistory.length,
    };
  }, [cycleHistory]);

  const largestItem = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((max, e) => ((e.amount || 0) > (max.amount || 0) ? e : max), filteredExpenses[0]);
  }, [filteredExpenses]);

  const largestCharge = largestItem?.amount || 0;

  const catBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const cat = e.category || "Uncategorized";
      breakdown[cat] = (breakdown[cat] || 0) + (e.amount || 0);
    });
    return Object.fromEntries(Object.entries(breakdown).sort(([, a], [, b]) => b - a));
  }, [filteredExpenses]);

  const chartCatBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    filteredExpensesBase.forEach((e) => {
      const cat = e.category || "Uncategorized";
      breakdown[cat] = (breakdown[cat] || 0) + (e.amount || 0);
    });
    return Object.fromEntries(Object.entries(breakdown).sort(([, a], [, b]) => b - a));
  }, [filteredExpensesBase]);

  const topCategory = useMemo(() => Object.keys(catBreakdown)[0] || "None", [catBreakdown]);

  const dailyTrend = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      if (e.date) map[e.date] = (map[e.date] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-10);
  }, [filteredExpenses]);

  const isDataLoaded = !user || (expensesLoaded && watchlistLoaded && subscriptionsLoaded && investmentsLoaded && settingsLoaded);
  const showLoader = authLoading || (user && !isDataLoaded);

  if (showLoader) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-bg-primary text-text-primary">
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 0.35; transform: scale(0.95); }
            50% { opacity: 0.95; transform: scale(1.05); }
          }
          .bento-cell {
            animation: pulse-dot 1.4s ease-in-out infinite;
          }
          .bento-cell-1 { animation-delay: 0s; }
          .bento-cell-2 { animation-delay: 0.2s; }
          .bento-cell-3 { animation-delay: 0.4s; }
          .bento-cell-4 { animation-delay: 0.6s; }
        `}</style>
        
        <div className="flex flex-col items-center gap-6">
          <div className="grid grid-cols-2 gap-1.5 w-11 h-11">
            <div className="bento-cell bento-cell-1 rounded-[4px] bg-text-primary" />
            <div className="bento-cell bento-cell-2 rounded-[4px] bg-text-primary/60" />
            <div className="bento-cell bento-cell-3 rounded-[4px] bg-text-primary/60" />
            <div className="bento-cell bento-cell-4 rounded-[4px] bg-text-primary/30" />
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
            firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider())
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
        setWatchlist={setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
        disconnectAnilist={disconnectAnilist}
        disconnectTrakt={disconnectTrakt}
      />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        anilistUser={anilistUser}
        traktUser={traktUser}
        connectAnilist={connectAnilist}
        disconnectAnilist={disconnectAnilist}
        syncAnilist={syncAnilist}
        isSyncingAnilist={isSyncingAnilist}
        connectTrakt={connectTrakt}
        disconnectTrakt={disconnectTrakt}
        syncTrakt={syncTrakt}
        isSyncingTrakt={isSyncingTrakt}
        letterboxdUsername={letterboxdUsername || null}
        connectLetterboxd={() => setShowLetterboxdModal(true)}
        disconnectLetterboxd={disconnectLetterboxd}
        syncLetterboxd={handleLetterboxdImport}
        isSyncingLetterboxd={isImportingLetterboxd}
        showInvestmentsTab={showInvestmentsTab}
        isProUser={isProUser}
        onClaimPro={() => setShowClaimPro(true)}
        setShowOnboarding={setShowOnboarding}
        triggerConfirm={triggerConfirm}
        firebaseAuth={firebaseAuth}
        setExpenses={setExpenses}
        setWatchlist={setWatchlist}
        setExpensesLoaded={setExpensesLoaded}
      />

      <main className="ml-[250px] flex max-w-[1300px] flex-1 flex-col gap-7 px-10 py-8 min-[769px]:max-[1100px]:ml-[210px] min-[769px]:max-[1100px]:gap-[22px] min-[769px]:max-[1100px]:px-7 min-[769px]:max-[1100px]:py-6 max-md:ml-0 max-md:w-full max-md:max-w-full max-md:gap-3.5 max-md:p-3.5 max-md:pb-[calc(68px+env(safe-area-inset-bottom))]">
        {activeTab === "expenses" && (
          <>
            <ExpensesTab
              currency={currency}
              setCurrency={setCurrency}
              expenseTab={expenseTab}
              setExpenseTab={setExpenseTab}
              timeFilter={timeFilter}
              setTimeFilter={setTimeFilter}
              salaryDay={salaryDay}
              setSalaryDay={setSalaryDay}
              totalSpent={totalSpent}
              filteredExpenses={filteredExpenses}
              largestCharge={largestCharge}
              largestItem={largestItem}
              topCategory={topCategory}
              activeChart={activeChart}
              setActiveChart={setActiveChart}
              catBreakdown={catBreakdown}
              chartCatBreakdown={chartCatBreakdown}
              dailyTrend={dailyTrend}
              addExpense={addExpense}
              expenseTitle={expenseTitle}
              setExpenseTitle={setExpenseTitle}
              expenseAmount={expenseAmount}
              setExpenseAmount={setExpenseAmount}
              expenseCategory={expenseCategory}
              setExpenseCategory={setExpenseCategory}
              allCategories={allCategories}
              newCategoryInput={newCategoryInput}
              setNewCategoryInput={setNewCategoryInput}
              customCategories={customCategories}
              setCustomCategories={setCustomCategories}
              expenseDate={expenseDate}
              setExpenseDate={setExpenseDate}
              expenseNotes={expenseNotes}
              setExpenseNotes={setExpenseNotes}
              isAddingExpense={isAddingExpense}
              deleteExpense={deleteExpense}
              expenseSearch={expenseSearch}
              setExpenseSearch={setExpenseSearch}
              ledgerCategoryFilter={ledgerCategoryFilter}
              setLedgerCategoryFilter={setLedgerCategoryFilter}
              ledgerMinAmount={ledgerMinAmount}
              setLedgerMinAmount={setLedgerMinAmount}
              ledgerMaxAmount={ledgerMaxAmount}
              setLedgerMaxAmount={setLedgerMaxAmount}
              ledgerSortField={ledgerSortField}
              setLedgerSortField={setLedgerSortField}
              ledgerSortDir={ledgerSortDir}
              setLedgerSortDir={setLedgerSortDir}
              isFetchingExpenses={isFetchingExpenses}
              expensesLoaded={expensesLoaded}
              subscriptions={subscriptions}
              expenses={expenses}
              updateSubscription={updateSubscription}
              logSubscriptionExpense={logSubscriptionExpense}
              importExpensesBatch={importExpensesBatch}
            />

            {expenseTab === "subscriptions" && (
              <SubscriptionsTab
                subscriptions={subscriptions}
                currency={currency}
                subName={subName}
                setSubName={setSubName}
                subIcon={subIcon}
                setSubIcon={setSubIcon}
                subCost={subCost}
                setSubCost={setSubCost}
                subCycle={subCycle}
                setSubCycle={setSubCycle}
                subNextDate={subNextDate}
                setSubNextDate={setSubNextDate}
                isAddingSub={isAddingSub}
                addSubscription={addSubscription}
                deleteSubscription={deleteSubscription}
                updateSubscriptionIcon={updateSubscriptionIcon}
                isFetchingSubscriptions={isFetchingSubscriptions}
              />
            )}
          </>
        )}

        {activeTab === "media" && (
          <>
          <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-2">My Library</h1>
            <div className="mb-8 flex gap-6 border-b border-border-subtle max-sm:gap-4 max-sm:overflow-x-auto max-sm:scrollbar-none">
              
              <button
                onClick={() => setMediaSubTab("watchlist")}
                className={`relative pb-3 text-[13px] font-medium transition-all ${
                  mediaSubTab === "watchlist"
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Cine
                {mediaSubTab === "watchlist" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
                )}
              </button>
              <button
                onClick={() => setMediaSubTab("books")}
                className={`relative pb-3 text-[13px] font-medium transition-all ${
                  mediaSubTab === "books"
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Books
                {mediaSubTab === "books" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
                )}
              </button>
              <button
                onClick={() => setMediaSubTab("integrations")}
                className={`relative pb-3 text-[13px] font-medium transition-all ${
                  mediaSubTab === "integrations"
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Integrations
                {mediaSubTab === "integrations" && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
                )}
              </button>
            </div>

            {mediaSubTab === "watchlist" && (
              <WatchlistTab
                watchlist={watchlist}
                watchlistFilter={watchlistFilter}
                setWatchlistFilter={setWatchlistFilter}
                mediaQuery={mediaQuery}
                setMediaQuery={setMediaQuery}
                mediaType={mediaType}
                setMediaType={setMediaType}
                searchMedia={searchMedia}
                isSearchingMedia={isSearchingMedia}
                searchResults={searchResults}
                addToWatchlist={addToWatchlist}
                updateWatchItem={updateWatchItem}
                deleteWatchItem={deleteWatchItem}
                isFetchingWatchlist={isFetchingWatchlist}
                showLetterboxdModal={showLetterboxdModal}
                setShowLetterboxdModal={setShowLetterboxdModal}
                letterboxdUsername={letterboxdUsername}
                setLetterboxdUsername={setLetterboxdUsername}
                handleLetterboxdImport={handleLetterboxdImport}
                isImportingLetterboxd={isImportingLetterboxd}
                disconnectLetterboxd={disconnectLetterboxd}
                anilistUser={anilistUser}
                connectAnilist={connectAnilist}
                disconnectAnilist={disconnectAnilist}
                syncAnilist={syncAnilist}
                isSyncingAnilist={isSyncingAnilist}
                traktUser={traktUser}
                connectTrakt={connectTrakt}
                disconnectTrakt={disconnectTrakt}
                syncTrakt={syncTrakt}
                isSyncingTrakt={isSyncingTrakt}
                enrichMissingPosters={enrichMissingPosters}
                isEnrichingPosters={isEnrichingPosters}
                onItemClick={(item) => setSelectedMediaItem(item)}
                idToken={user?.idToken}
                openDataCorrection={() => setIsDataCorrectionOpen(true)}
              />
            )}

            {mediaSubTab === "books" && (
              <BooksTab
                watchlist={watchlist}
                bookQuery={bookQuery}
                setBookQuery={setBookQuery}
                searchBooks={searchBooks}
                isSearchingBooks={isSearchingBooks}
                bookResults={bookResults}
                addBook={addBook}
                bookFilter={bookFilter}
                setBookFilter={setBookFilter}
                updateWatchItem={updateWatchItem}
                deleteWatchItem={deleteWatchItem}
                isFetchingWatchlist={isFetchingWatchlist}
                enrichMissingBookCovers={enrichMissingBookCovers}
                isEnrichingBookCovers={isEnrichingBookCovers}
                onItemClick={setSelectedMediaItem}
                idToken={user?.idToken}
              />
            )}

            {mediaSubTab === "integrations" && (
              <IntegrationsTab
                watchlist={watchlist}
                showLetterboxdModal={showLetterboxdModal}
                setShowLetterboxdModal={setShowLetterboxdModal}
                letterboxdUsername={letterboxdUsername}
                setLetterboxdUsername={setLetterboxdUsername}
                handleLetterboxdImport={handleLetterboxdImport}
                isImportingLetterboxd={isImportingLetterboxd}
                disconnectLetterboxd={disconnectLetterboxd}
                anilistUser={anilistUser}
                connectAnilist={connectAnilist}
                disconnectAnilist={disconnectAnilist}
                syncAnilist={syncAnilist}
                isSyncingAnilist={isSyncingAnilist}
                traktUser={traktUser}
                connectTrakt={connectTrakt}
                disconnectTrakt={disconnectTrakt}
                syncTrakt={syncTrakt}
                isSyncingTrakt={isSyncingTrakt}
              />
            )}
          </>
        )}

        {activeTab === "investments" && (
          <InvestmentsTab
            investments={investments}
            currency={currency}
            invName={invName}
            setInvName={setInvName}
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
            isAddingAsset={isAddingAsset}
            addInvestment={addInvestment}
            deleteInvestment={deleteInvestment}
            sellInvestment={sellInvestment}
            isUpdatingPrices={isUpdatingPrices}
            updateMarketPrices={updateMarketPrices}
            isFetchingInvestments={isFetchingInvestments}
            invSuggestions={invSuggestions}
            setInvSuggestions={setInvSuggestions}
            selectSuggestion={selectSuggestion}
          />
        )}

        {activeTab === "financial" && isProUser && (
          <FinancialHealthTab
            currency={currency}
            investments={investments}
            showInvestmentsTab={showInvestmentsTab}
            salaryDay={salaryDay}
            monthlySalary={monthlySalary}
            setMonthlySalary={setMonthlySalary}
            additionalIncome={additionalIncome}
            setAdditionalIncome={setAdditionalIncome}
            payCycle={payCycle}
            savedReconciliation={reconciliations[payCycle.startStr]}
            setReconciliation={setReconciliation}
            salaryLog={salaryLog}
            setSalaryLogEntry={setSalaryLogEntry}
            cycleHistory={cycleHistory}
            cycleAverages={cycleAverages}
            reconciliations={reconciliations}
            logUnaccountedGap={logUnaccountedGap}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            expenses={expenses}
            watchlist={watchlist}
            investments={investments}
            currency={currency}
            salaryDay={salaryDay}
            salaryLog={salaryLog}
            isProUser={isProUser}
            cycleHistory={cycleHistory}
            reconciliations={reconciliations}
          />
        )}

        {activeTab === "admin" && user && user.email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com") && (
          <AdminTab user={user} />
        )}
      </main>

      <ConfirmModal confirmDlg={confirmDlg} setConfirmDlg={setConfirmDlg} />
      <SyncPreviewModal preview={syncPreview} onClose={() => setSyncPreview((prev) => ({ ...prev, isOpen: false }))} />
      <OnboardingModal
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
        showInvestmentsTab={showInvestmentsTab}
      />

      {showLetterboxdModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex w-[400px] flex-col gap-4 rounded-card border border-border-subtle bg-white p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold tracking-[0.8px] text-text-secondary uppercase">Sync Letterboxd RSS</span>
              <button onClick={() => setShowLetterboxdModal(false)} className="cursor-pointer border-none bg-transparent p-1 text-base">✕</button>
            </div>
            <p className="text-xs leading-[1.4] text-text-muted">
              Enter your Letterboxd username to fetch and sync your recent watched diary entries from your public RSS feed.
            </p>
            <input
              type="text"
              placeholder="Username (e.g. fal3n4ngel)"
              value={letterboxdUsername}
              onChange={(e) => setLetterboxdUsername(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus"
            />
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setShowLetterboxdModal(false)} className="h-9 cursor-pointer rounded-md border border-border-subtle bg-transparent px-4 text-xs font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary">
                Cancel
              </button>
              <button
                onClick={handleLetterboxdImport}
                disabled={isImportingLetterboxd || !letterboxdUsername.trim()}
                className="h-9 cursor-pointer rounded-md border border-text-primary bg-text-primary px-5 text-xs font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImportingLetterboxd ? "Syncing..." : "Sync Feed"}
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
          updateWatchItem={updateWatchItem}
        />
      )}

      {enableChatAssistant && isProUser && (
        <KirokuChatBubble idToken={user?.idToken} />
      )}

      {user && (
        <ClaimProModal
          isOpen={showClaimPro}
          onClose={() => setShowClaimPro(false)}
          idToken={user.idToken}
        />
      )}

      <DataCorrectionModal
        isOpen={isDataCorrectionOpen}
        onClose={() => setIsDataCorrectionOpen(false)}
        watchlist={watchlist}
        getHeaders={getHeaders}
        triggerAlert={triggerAlert}
        onSuccess={() => {
          setIsDataCorrectionOpen(false);
          fetchWatchlist();
        }}
      />
    </div>
  );
}
