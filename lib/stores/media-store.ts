import { create } from 'zustand';
import { WatchlistItem, SearchResult, AniListUser, TraktUser } from "@/types";

interface MediaState {
  watchlist: WatchlistItem[];
  setWatchlist: (watchlist: WatchlistItem[] | ((prev: WatchlistItem[]) => WatchlistItem[])) => void;
  isFetchingWatchlist: boolean;
  setIsFetchingWatchlist: (is: boolean) => void;
  watchlistLoaded: boolean;
  setWatchlistLoaded: (loaded: boolean) => void;

  mediaQuery: string;
  setMediaQuery: (s: string) => void;
  mediaType: "movie" | "show" | "anime" | "book";
  setMediaType: (t: "movie" | "show" | "anime" | "book") => void;
  searchResults: SearchResult[];
  setSearchResults: (r: SearchResult[]) => void;
  isSearchingMedia: boolean;
  setIsSearchingMedia: (is: boolean) => void;
  watchlistFilter: "all" | "anime" | "movie" | "show";
  setWatchlistFilter: (f: "all" | "anime" | "movie" | "show") => void;
  isEnrichingPosters: boolean;
  setIsEnrichingPosters: (is: boolean) => void;

  showLetterboxdModal: boolean;
  setShowLetterboxdModal: (show: boolean) => void;
  letterboxdUsername: string;
  setLetterboxdUsername: (u: string) => void;
  isImportingLetterboxd: boolean;
  setIsImportingLetterboxd: (is: boolean) => void;

  bookQuery: string;
  setBookQuery: (s: string) => void;
  isSearchingBooks: boolean;
  setIsSearchingBooks: (is: boolean) => void;
  bookResults: SearchResult[];
  setBookResults: (r: SearchResult[]) => void;
  bookFilter: "all" | "reading" | "to_read" | "completed";
  setBookFilter: (f: "all" | "reading" | "to_read" | "completed") => void;
  isEnrichingBookCovers: boolean;
  setIsEnrichingBookCovers: (is: boolean) => void;

  anilistUser: AniListUser | null;
  setAnilistUser: (u: AniListUser | null) => void;
  traktUser: TraktUser | null;
  setTraktUser: (u: TraktUser | null) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  watchlist: [],
  setWatchlist: (watchlist) =>
    set((state) => ({
      watchlist: typeof watchlist === "function" ? watchlist(state.watchlist) : watchlist,
    })),
  isFetchingWatchlist: false,
  setIsFetchingWatchlist: (isFetchingWatchlist) => set({ isFetchingWatchlist }),
  watchlistLoaded: false,
  setWatchlistLoaded: (watchlistLoaded) => set({ watchlistLoaded }),

  mediaQuery: "",
  setMediaQuery: (mediaQuery) => set({ mediaQuery }),
  mediaType: "movie",
  setMediaType: (mediaType) => set({ mediaType }),
  searchResults: [],
  setSearchResults: (searchResults) => set({ searchResults }),
  isSearchingMedia: false,
  setIsSearchingMedia: (isSearchingMedia) => set({ isSearchingMedia }),
  watchlistFilter: "all",
  setWatchlistFilter: (watchlistFilter) => set({ watchlistFilter }),
  isEnrichingPosters: false,
  setIsEnrichingPosters: (isEnrichingPosters) => set({ isEnrichingPosters }),

  showLetterboxdModal: false,
  setShowLetterboxdModal: (showLetterboxdModal) => set({ showLetterboxdModal }),
  letterboxdUsername: "",
  setLetterboxdUsername: (letterboxdUsername) => set({ letterboxdUsername }),
  isImportingLetterboxd: false,
  setIsImportingLetterboxd: (isImportingLetterboxd) => set({ isImportingLetterboxd }),

  bookQuery: "",
  setBookQuery: (bookQuery) => set({ bookQuery }),
  isSearchingBooks: false,
  setIsSearchingBooks: (isSearchingBooks) => set({ isSearchingBooks }),
  bookResults: [],
  setBookResults: (bookResults) => set({ bookResults }),
  bookFilter: "all",
  setBookFilter: (bookFilter) => set({ bookFilter }),
  isEnrichingBookCovers: false,
  setIsEnrichingBookCovers: (isEnrichingBookCovers) => set({ isEnrichingBookCovers }),

  anilistUser: null,
  setAnilistUser: (anilistUser) => set({ anilistUser }),
  traktUser: null,
  setTraktUser: (traktUser) => set({ traktUser }),
}));
