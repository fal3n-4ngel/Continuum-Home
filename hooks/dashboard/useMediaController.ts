"use client";

import { useState, useEffect } from "react";
import { WatchlistItem, SearchResult } from "@/types";
import { anilistQuery, traktRequest } from "@/lib/integrations";
import { pushWatchlistUpdate, type SyncEntry } from "@/lib/firebase";
import { safeLocalStorage } from "@/lib/utils/storage";
import { useMediaStore } from "@/lib/stores/media-store";
import { SyncPreviewState, SyncPreviewItem } from "@/components/modals";
import { parseGoodreadsCsv } from "@/features/media/lib/goodreads-csv";

interface UseMediaControllerProps {
  user: { uid: string; idToken?: string } | null;
  getHeaders: () => Record<string, string>;
  patchSettings: (patch: Record<string, unknown>) => Promise<void>;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
  setConfirmDlg: React.Dispatch<React.SetStateAction<any>>;
}

export function useMediaController({
  user,
  getHeaders,
  patchSettings,
  triggerConfirm,
  setConfirmDlg,
}: UseMediaControllerProps) {
  const {
    watchlist, setWatchlist,
    isFetchingWatchlist, setIsFetchingWatchlist,
    watchlistLoaded, setWatchlistLoaded,
    mediaQuery, setMediaQuery,
    mediaType, setMediaType,
    searchResults, setSearchResults,
    isSearchingMedia, setIsSearchingMedia,
    watchlistFilter, setWatchlistFilter,
    isEnrichingPosters, setIsEnrichingPosters,
    showLetterboxdModal, setShowLetterboxdModal,
    letterboxdUsername, setLetterboxdUsername,
    isImportingLetterboxd, setIsImportingLetterboxd,
    showGoodreadsModal, setShowGoodreadsModal,
    goodreadsUserId, setGoodreadsUserId,
    isImportingGoodreads, setIsImportingGoodreads,
    bookQuery, setBookQuery,
    isSearchingBooks, setIsSearchingBooks,
    bookResults, setBookResults,
    bookFilter, setBookFilter,
    isEnrichingBookCovers, setIsEnrichingBookCovers,
    anilistUser, setAnilistUser,
    traktUser, setTraktUser,
  } = useMediaStore();


  const [syncPreview, setSyncPreview] = useState<SyncPreviewState>({
    isOpen: false,
    title: "",
    newItems: [],
    updatedItems: [],
    onConfirm: () => {},
  });

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
      onConfirm: () => setConfirmDlg((prev: any) => ({ ...prev, isOpen: false })),
      confirmText,
      variant: "alert",
      tone,
    });
  };

  async function loadAnilistUser(token: string) {
    try {
      const data = await anilistQuery(`query { Viewer { id name avatar { large } } }`, {}, token);
      const viewer = data.data?.Viewer;
      if (viewer) {
        setAnilistUser({ id: viewer.id, name: viewer.name, avatar: viewer.avatar?.large || null, token });
      }
    } catch (err) {
      console.error("Failed to load AniList profile:", err);
      setAnilistUser({ id: 0, name: "AniList User", avatar: null, token });
    }
  }

  function connectAnilist() {
    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "46469";
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=token`;
  }

  function disconnectAnilist() {
    safeLocalStorage.removeItem("anilist_token");
    setAnilistUser(null);
    patchSettings({ integrations: { anilist: null } });
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
    safeLocalStorage.removeItem("trakt_access_token");
    safeLocalStorage.removeItem("trakt_refresh_token");
    setTraktUser(null);
    patchSettings({ integrations: { trakt: null } });
  }

  function disconnectLetterboxd() {
    safeLocalStorage.removeItem("letterboxd_username");
    setLetterboxdUsername("");
    patchSettings({ integrations: { letterboxd: null } });
  }

  function disconnectGoodreads() {
    safeLocalStorage.removeItem("goodreads_user_id");
    setGoodreadsUserId("");
    patchSettings({ integrations: { goodreads: null } });
  }

  const [isSyncingAnilist, setIsSyncingAnilist] = useState(false);
  const [isSyncingTrakt, setIsSyncingTrakt] = useState(false);

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
    if (!imdbId) return null;
    try {
      const res = await fetch(`/api/omdb?i=${imdbId}`);
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
      const watchedMovies = await traktRequest(idToken, "sync/watched/movies", { token: traktUser.accessToken }).catch(() => []);
      const watchedShows = await traktRequest(idToken, "sync/watched/shows", { token: traktUser.accessToken }).catch(() => []);

      const watchlistMovies = await traktRequest(idToken, "sync/watchlist/movies", { token: traktUser.accessToken }).catch(() => []);
      const watchlistShows = await traktRequest(idToken, "sync/watchlist/shows", { token: traktUser.accessToken }).catch(() => []);

      const entries: SyncEntry[] = [];
      const processedTraktIds = new Set<number>();

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
          for (const item of missing) {
            let imdbId = null;

            if (item.traktId) {
              try {
                const details = await traktRequest(user?.idToken, `${item.type}s/${item.traktId}`);
                imdbId = details?.ids?.imdb || null;
              } catch (e) {
                console.error("Trakt details fetch error:", e);
              }
            }

            let coverImage = null;
            try {
              const searchUrl = imdbId
                ? `/api/omdb?i=${imdbId}`
                : `/api/omdb?t=${encodeURIComponent(item.title)}&y=${item.year || ""}`;
              const omdbRes = await fetch(searchUrl);
              if (omdbRes.ok) {
                const omdbData = await omdbRes.json();
                coverImage = omdbData.Poster && omdbData.Poster !== "N/A" ? omdbData.Poster : null;
              }
            } catch (e) {
              console.error("OMDb search error:", e);
            }

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

  const addToWatchlist = async (res: SearchResult): Promise<boolean> => {
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
    try {
      const apiRes = await fetch("/api/watchlist", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (apiRes.ok) {
        const createdData = await apiRes.json().catch(() => ({}));
        const createdItem: WatchlistItem = {
          ...body,
          id: createdData.id || `temp-${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setWatchlist((prev) => [createdItem, ...prev.filter((item) => item.id !== createdItem.id)]);
        fetchWatchlist();
        pushWatchlistUpdate(user?.idToken, createdItem, { status: "plan_to_watch" }).catch((e) => console.error(e));
        return true;
      }
      return false;
    } catch (err) {
      console.error("[addToWatchlist] Error adding item:", err);
      return false;
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
            safeLocalStorage.setItem("letterboxd_username", letterboxdUsername.trim());
            patchSettings({ integrations: { letterboxd: { username: letterboxdUsername.trim() } } });
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

  const handleGoodreadsSync = async () => {
    if (!goodreadsUserId.trim()) return;
    setIsImportingGoodreads(true);
    try {
      const res = await fetch(`/api/watchlist/goodreads?userId=${encodeURIComponent(goodreadsUserId.trim())}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to fetch Goodreads RSS shelves.");
      }

      const { books } = await res.json();
      if (!books || books.length === 0) {
        throw new Error("No books found in this Goodreads account's public shelves.");
      }

      const { newItems, updatedItems, newCount, updatedCount } = diffSyncEntries(books, (e) =>
        watchlist.find((w) => w.type === "book" && w.title.toLowerCase().trim() === e.title.toLowerCase().trim())
      );

      if (newCount === 0 && updatedCount === 0) {
        triggerAlert("Goodreads Sync", "Your book library already matches Goodreads — nothing to sync.", "info");
        return;
      }

      const applyGoodreadsSync = async () => {
        setSyncPreview((prev) => ({ ...prev, isApplying: true }));
        setIsImportingGoodreads(true);
        try {
          const syncRes = await fetch("/api/watchlist/sync", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ source: "goodreads", entries: books }),
          });
          if (syncRes.ok) {
            const result = await syncRes.json();
            setShowGoodreadsModal(false);
            safeLocalStorage.setItem("goodreads_user_id", goodreadsUserId.trim());
            patchSettings({ integrations: { goodreads: { userId: goodreadsUserId.trim() } } });
            fetchWatchlist();
            setSyncPreview((prev) => ({ ...prev, isOpen: false }));
            triggerAlert("Goodreads Sync Complete", `Successfully synced ${result.added || 0} new and ${result.updated || 0} updated books!`, "success");
          } else {
            throw new Error("Server rejected sync payload.");
          }
        } catch (err: any) {
          triggerAlert("Sync Failed", err?.message || "Failed to sync Goodreads feed.", "danger");
        } finally {
          setIsImportingGoodreads(false);
          setSyncPreview((prev) => ({ ...prev, isApplying: false }));
        }
      };

      setSyncPreview({ isOpen: true, title: "Sync Goodreads", newItems, updatedItems, onConfirm: applyGoodreadsSync });
    } catch (err: any) {
      triggerAlert("Sync Failed", err?.message || "Failed to parse Goodreads feed", "danger");
    } finally {
      setIsImportingGoodreads(false);
    }
  };

  const handleGoodreadsCsvImport = async (file: File) => {
    setIsImportingGoodreads(true);
    try {
      const text = await file.text();
      const { books } = parseGoodreadsCsv(text);
      if (!books || books.length === 0) {
        throw new Error("No valid book entries found in the uploaded CSV file.");
      }

      const { newItems, updatedItems, newCount, updatedCount } = diffSyncEntries(books, (e) =>
        watchlist.find((w) => w.type === "book" && w.title.toLowerCase().trim() === e.title.toLowerCase().trim())
      );

      if (newCount === 0 && updatedCount === 0) {
        triggerAlert("Goodreads CSV Import", "Your library already contains all books from this CSV — nothing to sync.", "info");
        return;
      }

      const applyGoodreadsCsv = async () => {
        setSyncPreview((prev) => ({ ...prev, isApplying: true }));
        setIsImportingGoodreads(true);
        try {
          const syncRes = await fetch("/api/watchlist/sync", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ source: "goodreads_csv", entries: books }),
          });
          if (syncRes.ok) {
            const result = await syncRes.json();
            setShowGoodreadsModal(false);
            fetchWatchlist();
            setSyncPreview((prev) => ({ ...prev, isOpen: false }));
            triggerAlert("Goodreads CSV Import Complete", `Successfully imported ${result.added || 0} new and ${result.updated || 0} updated books!`, "success");
          } else {
            throw new Error("Server rejected sync payload.");
          }
        } catch (err: any) {
          triggerAlert("Import Failed", err?.message || "Failed to import Goodreads CSV.", "danger");
        } finally {
          setIsImportingGoodreads(false);
          setSyncPreview((prev) => ({ ...prev, isApplying: false }));
        }
      };

      setSyncPreview({ isOpen: true, title: "Import Goodreads CSV", newItems, updatedItems, onConfirm: applyGoodreadsCsv });
    } catch (err: any) {
      triggerAlert("Import Failed", err?.message || "Failed to parse Goodreads CSV file.", "danger");
    } finally {
      setIsImportingGoodreads(false);
    }
  };

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

  const addBook = async (b: SearchResult): Promise<boolean> => {
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
    try {
      const apiRes = await fetch("/api/watchlist", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (apiRes.ok) {
        const createdData = await apiRes.json().catch(() => ({}));
        const createdItem: WatchlistItem = {
          ...body,
          id: createdData.id || `temp-${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setWatchlist((prev) => [createdItem, ...prev.filter((item) => item.id !== createdItem.id)]);
        fetchWatchlist();
        return true;
      }
      return false;
    } catch (err) {
      console.error("[addBook] Error adding book:", err);
      return false;
    }
  };


  useEffect(() => {
    if (!user) return;
    const aniToken = safeLocalStorage.getItem("anilist_token");
    if (aniToken) loadAnilistUser(aniToken);

    const trAcc = safeLocalStorage.getItem("trakt_access_token");
    const trRef = safeLocalStorage.getItem("trakt_refresh_token");
    if (trAcc && trRef) loadTraktUser(trAcc, trRef, user.idToken);

    const lbUser = safeLocalStorage.getItem("letterboxd_username");
    if (lbUser) setLetterboxdUsername(lbUser);

    const grUser = safeLocalStorage.getItem("goodreads_user_id");
    if (grUser) setGoodreadsUserId(grUser);
  }, [user]);

  useEffect(() => {
    const handleWatchlistUpdate = () => {
      fetchWatchlist();
    };
    window.addEventListener("watchlist-updated", handleWatchlistUpdate);
    return () => window.removeEventListener("watchlist-updated", handleWatchlistUpdate);
  }, [user]);

  return {
    watchlist,
    setWatchlist,
    isFetchingWatchlist,
    watchlistLoaded,
    mediaQuery,
    setMediaQuery,
    mediaType,
    setMediaType,
    searchResults,
    isSearchingMedia,
    watchlistFilter,
    setWatchlistFilter,
    isEnrichingPosters,
    showLetterboxdModal,
    setShowLetterboxdModal,
    letterboxdUsername,
    setLetterboxdUsername,
    isImportingLetterboxd,
    showGoodreadsModal,
    setShowGoodreadsModal,
    goodreadsUserId,
    setGoodreadsUserId,
    isImportingGoodreads,
    bookQuery,
    setBookQuery,
    isSearchingBooks,
    bookResults,
    bookFilter,
    setBookFilter,
    isEnrichingBookCovers,
    anilistUser,
    setAnilistUser,
    traktUser,
    setTraktUser,
    syncPreview,
    setSyncPreview,
    triggerAlert,
    loadAnilistUser,
    connectAnilist,
    disconnectAnilist,
    loadTraktUser,
    connectTrakt,
    disconnectTrakt,
    disconnectLetterboxd,
    disconnectGoodreads,
    isSyncingAnilist,
    isSyncingTrakt,
    syncAnilist,
    syncTrakt,
    enrichMissingPosters,
    enrichMissingBookCovers,
    fetchWatchlist,
    updateWatchItem,
    deleteWatchItem,
    searchMedia,
    addToWatchlist,
    handleLetterboxdImport,
    handleGoodreadsSync,
    handleGoodreadsCsvImport,
    searchBooks,
    addBook,
  };
}
