import React, { useState, useEffect } from "react";
import { WatchlistItem, FirebaseUser } from "@/types";
import { anilistQuery } from "@/lib/anilist";
import { traktRequest } from "@/lib/trakt-client";
import { isSafeImageUrl } from "@/lib/safe-url";
import { Pencil } from "lucide-react";

interface MediaDetailsModalProps {
  item: WatchlistItem;
  onClose: () => void;
  user: FirebaseUser;
  updateWatchItem: (item: WatchlistItem, updates: Partial<WatchlistItem>) => void;
}

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

// Confidence gate for text-search fallbacks (OMDb "?t=", TVMaze singlesearch,
// Google Books intitle, OpenLibrary search): these search BY the stored
// title and can confidently return a different, wrong entity — e.g.
// searching "Alien 3" matching a documentary called "The Making of 'Alien
// 3'". A loose substring check would still pass that case (the stored title
// is literally contained in the wrong result), so this requires the two
// titles to match exactly once normalized, before any of that branch's
// year/cover is trusted.
const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "");
const isConfidentMatch = (storedTitle: string, candidateTitle: string | null | undefined) => {
  if (!candidateTitle) return false;
  const a = normalizeTitle(storedTitle);
  const b = normalizeTitle(candidateTitle);
  return !!a && !!b && a === b;
};

// One outcome shape shared by every lookup source below. `stop: true` means
// "a synopsis was found here, don't try further fallback sources" — mirrors
// the early `return`s the old single mega-function used to have inline.
// Splitting these out of one function keeps each source's own branching
// isolated (each is independently trivial to type-check) instead of one
// ~300-line function threading foundTitle/foundYear/foundCover/omdbSucceeded
// through five nested try/catch blocks, which is a well-known TypeScript
// control-flow-analysis slow path — this file alone was taking 10-15x longer
// to lint than any other file in the project (~60s+ vs ~4-6s).
interface LookupOutcome {
  synopsis?: string | null;
  director?: string | null;
  author?: string | null;
  title?: string | null;
  year?: number | null;
  cover?: string | null;
  stop: boolean;
}

async function lookupAnime(anilistId: number): Promise<LookupOutcome> {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        description
        startDate { year }
        title { english romaji }
        coverImage { large }
        staff(limit: 8) {
          edges {
            role
            node { name { full } }
          }
        }
      }
    }
  `;
  const data = await anilistQuery(query, { id: anilistId });
  const media = data?.data?.Media;
  const desc = media?.description;
  const staffEdges = media?.staff?.edges || [];
  const dirNode = staffEdges.find((e: any) => e.role && e.role.toLowerCase().includes("director"));
  return {
    synopsis: desc ? stripHtml(desc) : null,
    director: dirNode ? dirNode.node.name.full : null,
    title: media?.title?.english || media?.title?.romaji || null,
    year: media?.startDate?.year || null,
    cover: media?.coverImage?.large || null,
    stop: !!desc,
  };
}

// Fetches Trakt's own details, then falls back to OMDb-by-imdbId for
// director/synopsis/year/cover, then Trakt's People endpoint for director
// only if OMDb didn't succeed at all. Lets the initial Trakt fetch's
// exception propagate (uncaught here) so the caller's try/catch can fall
// through to the next source — matching the original's behavior where only
// that first fetch failing continues the fallback chain.
async function lookupTraktDetails(idToken: string | undefined, type: "movie" | "show", traktId: number): Promise<LookupOutcome> {
  const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
  const details = await traktRequest(idToken, `${type}s/${traktId}`);

  let synopsis: string | null = details?.overview || null;
  let year: number | null = details?.year ? Number(details.year) : null;
  let title: string | null = details?.title || null;
  let director: string | null = null;
  let cover: string | null = null;
  const imdbId = details?.ids?.imdb;
  let omdbSucceeded = false;

  if (imdbId && apiKey) {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${apiKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data.Director && data.Director !== "N/A") director = data.Director;
        if (data.Plot && data.Plot !== "N/A" && !details?.overview) synopsis = data.Plot;
        if (!year && data.Year) {
          const parsed = parseInt(String(data.Year).slice(0, 4), 10);
          if (!Number.isNaN(parsed)) year = parsed;
        }
        if (!title && data.Title) title = data.Title;
        if (!cover && data.Poster && data.Poster !== "N/A") cover = data.Poster;
        omdbSucceeded = true;
      }
    } catch (e) {
      console.error("OMDb inner search failed:", e);
    }
  }

  if (!omdbSucceeded) {
    try {
      const people = await traktRequest(idToken, `${type}s/${traktId}/people`);
      const directors = people?.crew?.directing
        ?.filter((m: any) => m.job === "Director")
        ?.map((m: any) => m.person?.name);
      if (directors && directors.length > 0) director = directors.join(", ");
    } catch (peopleErr) {
      console.error("Trakt people failed:", peopleErr);
    }
  }

  return { synopsis, director, title, year, cover, stop: true };
}

async function lookupTvMazeSummary(title: string): Promise<LookupOutcome> {
  try {
    const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`);
    if (!res.ok) return { stop: false };
    const data = await res.json();
    const result: LookupOutcome = {
      synopsis: data.summary ? stripHtml(data.summary) : null,
      director: data._embedded?.cast?.[0]?.person?.name || null,
      stop: !!data.summary,
    };
    // Fuzzy text search by the (possibly wrong) stored title — year/cover
    // only trusted when TVMaze's own result title matches what we searched.
    if (isConfidentMatch(title, data.name)) {
      if (data.premiered) {
        const parsed = parseInt(String(data.premiered).slice(0, 4), 10);
        if (!Number.isNaN(parsed)) result.year = parsed;
      }
      if (data.image?.original || data.image?.medium) {
        result.cover = data.image.original || data.image.medium;
      }
    }
    return result;
  } catch (e) {
    console.error("TVMaze summary error:", e);
    return { stop: false };
  }
}

async function lookupOmdbByTitle(title: string): Promise<LookupOutcome> {
  const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
  if (!apiKey) return { stop: false };
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=full&apikey=${apiKey}`);
    if (!res.ok) return { stop: false };
    const data = await res.json();
    const result: LookupOutcome = {
      director: data.Director && data.Director !== "N/A" ? data.Director : null,
      stop: false,
    };
    // OMDb's "?t=" is an approximate title search, not an id lookup — same
    // fuzzy-match caveat as TVMaze above.
    if (isConfidentMatch(title, data.Title)) {
      if (data.Year) {
        const parsed = parseInt(String(data.Year).slice(0, 4), 10);
        if (!Number.isNaN(parsed)) result.year = parsed;
      }
      if (data.Poster && data.Poster !== "N/A") result.cover = data.Poster;
    }
    if (data.Plot && data.Plot !== "N/A") {
      result.synopsis = data.Plot;
      result.stop = true;
    }
    return result;
  } catch (e) {
    console.error("OMDb plot error:", e);
    return { stop: false };
  }
}

async function lookupBooks(title: string): Promise<LookupOutcome> {
  let synopsis: string | null = null;
  let author: string | null = null;
  let year: number | null = null;
  let cover: string | null = null;
  let descFound = false;

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}`);
    if (res.ok) {
      const data = await res.json();
      const desc = data.items?.[0]?.volumeInfo?.description;
      const authors = data.items?.[0]?.volumeInfo?.authors;
      const publishedDate = data.items?.[0]?.volumeInfo?.publishedDate;
      const bookTitle = data.items?.[0]?.volumeInfo?.title;
      const bookCover = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (authors && authors.length > 0) author = authors.join(", ");
      // Books never get a foundTitle suggestion — only year/cover, and only
      // when the search's own result title matches what we searched for.
      if (isConfidentMatch(title, bookTitle)) {
        if (publishedDate) {
          const parsed = parseInt(String(publishedDate).slice(0, 4), 10);
          if (!Number.isNaN(parsed)) year = parsed;
        }
        if (bookCover) cover = bookCover.replace(/^http:/, "https:");
      }
      if (desc) {
        synopsis = desc;
        descFound = true;
      }
    }
  } catch (e) {
    console.warn("Google Books API failed, falling back to OpenLibrary:", e);
  }

  if (!descFound) {
    try {
      const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const firstDoc = searchData.docs?.[0];
        const workKey = firstDoc?.key;
        const authorNames = firstDoc?.author_name;
        if (authorNames && authorNames.length > 0) author = authorNames.join(", ");
        if (isConfidentMatch(title, firstDoc?.title)) {
          if (!year && firstDoc?.first_publish_year) year = firstDoc.first_publish_year;
          if (!cover && firstDoc?.cover_i) cover = `https://covers.openlibrary.org/b/id/${firstDoc.cover_i}-M.jpg`;
        }
        if (workKey) {
          const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
          if (workRes.ok) {
            const workData = await workRes.json();
            let desc = workData.description;
            if (desc) {
              if (typeof desc === "object" && desc.value) desc = desc.value;
              synopsis = stripHtml(desc);
              descFound = true;
            }
          }
        }
      }
    } catch (olErr) {
      console.error("OpenLibrary fallback failed:", olErr);
    }
  }

  return { synopsis, author, year, cover, stop: descFound };
}

export const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({ item, onClose, user, updateWatchItem }) => {
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [director, setDirector] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lets the user correct title/year/cover art directly from the popup — the
  // AI agent or a sync source occasionally gets these wrong (or omits year
  // entirely), and there was previously no way to fix it short of deleting
  // and re-adding the item.
  const [isEditing, setIsEditing] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(item.title);
  const [displayYear, setDisplayYear] = useState(item.year);
  const [displayCover, setDisplayCover] = useState(item.coverImage);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editYear, setEditYear] = useState(item.year != null ? String(item.year) : "");
  const [editCover, setEditCover] = useState(item.coverImage || "");

  // Title/year/cover found from the same lookups already run for the
  // synopsis (AniList / Trakt / OMDb / TVMaze / Google Books / OpenLibrary —
  // each is an authoritative source we either looked up by id or searched by
  // the stored title against). A missing year or cover is backfilled
  // automatically; a title or year that disagrees with what's stored is
  // surfaced as one combined "mismatch found" banner rather than
  // auto-overwritten, since the agent or sync source could just be wrong
  // about which one is right.
  const [discrepancy, setDiscrepancy] = useState<{ title?: string; year?: number; coverImage?: string } | null>(null);
  // A missing poster is usually a symptom, not the root problem — the title
  // that was searched by didn't match anything at all. Surfaced separately
  // from `discrepancy` because there's nothing to "auto-fix" here; the user
  // has to supply a corrected title before any lookup can find a cover.
  const [noMatchFound, setNoMatchFound] = useState(false);

  useEffect(() => {
    setDisplayTitle(item.title);
    setDisplayYear(item.year);
    setDisplayCover(item.coverImage);
    setEditTitle(item.title);
    setEditYear(item.year != null ? String(item.year) : "");
    setEditCover(item.coverImage || "");
    setIsEditing(false);
    setDiscrepancy(null);
    setNoMatchFound(false);
  }, [item]);

  const applyDiscrepancyFix = () => {
    if (!discrepancy) return;
    const updates: Partial<WatchlistItem> = {};
    if (discrepancy.title) updates.title = discrepancy.title;
    if (discrepancy.year != null) updates.year = discrepancy.year;
    if (discrepancy.coverImage) updates.coverImage = discrepancy.coverImage;
    updateWatchItem(item, updates);
    if (updates.title) setDisplayTitle(updates.title);
    if (updates.year != null) setDisplayYear(updates.year);
    if (updates.coverImage) setDisplayCover(updates.coverImage);
    setDiscrepancy(null);
  };

  const handleSaveCorrection = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;
    const parsedYear = editYear.trim() ? Number(editYear.trim()) : null;
    const updates: Partial<WatchlistItem> = {
      title: trimmedTitle,
      year: parsedYear !== null && !Number.isNaN(parsedYear) ? parsedYear : null,
      coverImage: editCover.trim() || null,
    };
    updateWatchItem(item, updates);
    setDisplayTitle(updates.title!);
    setDisplayYear(updates.year ?? null);
    setDisplayCover(updates.coverImage ?? null);
    setIsEditing(false);
  };

  useEffect(() => {
    let active = true;

    const fetchSynopsis = async () => {
      setIsLoading(true);
      setSynopsis(null);
      setDirector(null);
      setAuthor(null);
      // Tracked locally rather than via state, since several lookup sources
      // below can each contribute a value and we want to reconcile once,
      // after the fetch settles, instead of racing partial state updates.
      let foundTitle: string | null = null;
      let foundYear: number | null = null;
      let foundCover: string | null = null;

      try {
        if (item.type === "anime" && item.anilistId) {
          const r = await lookupAnime(item.anilistId);
          if (active && r.synopsis) setSynopsis(r.synopsis);
          if (active && r.director) setDirector(r.director);
          if (foundTitle == null && r.title != null) foundTitle = r.title;
          if (foundYear == null && r.year != null) foundYear = r.year;
          if (foundCover == null && r.cover != null) foundCover = r.cover;
          if (r.stop && active) return;
        }

        if ((item.type === "movie" || item.type === "show") && item.traktId) {
          try {
            const r = await lookupTraktDetails(user.idToken, item.type, Number(item.traktId));
            if (active && r.synopsis) setSynopsis(r.synopsis);
            if (active && r.director) setDirector(r.director);
            if (foundTitle == null && r.title != null) foundTitle = r.title;
            if (foundYear == null && r.year != null) foundYear = r.year;
            if (foundCover == null && r.cover != null) foundCover = r.cover;
            if (active) return;
          } catch (e) {
            console.error("Trakt details fetch error:", e);
          }
        }

        // TVMaze fallback for shows Trakt misses.
        if (item.type === "show") {
          const r = await lookupTvMazeSummary(item.title);
          if (active && r.synopsis) setSynopsis(r.synopsis);
          if (active && r.director) setDirector(r.director);
          if (foundYear == null && r.year != null) foundYear = r.year;
          if (foundCover == null && r.cover != null) foundCover = r.cover;
          if (r.stop && active) return;
        }

        // OMDb fallback when Trakt has no synopsis.
        if (item.type === "movie" || item.type === "show") {
          const r = await lookupOmdbByTitle(item.title);
          if (active && r.director) setDirector(r.director);
          if (foundYear == null && r.year != null) foundYear = r.year;
          if (foundCover == null && r.cover != null) foundCover = r.cover;
          if (active && r.synopsis) {
            setSynopsis(r.synopsis);
            return;
          }
        }

        if (item.type === "book") {
          const r = await lookupBooks(item.title);
          if (active && r.author) setAuthor(r.author);
          if (foundYear == null && r.year != null) foundYear = r.year;
          if (foundCover == null && r.cover != null) foundCover = r.cover;
          if (active && r.synopsis) {
            setSynopsis(r.synopsis);
            return;
          }
        }

        if (active) {
          setSynopsis("No synopsis available.");
        }
      } catch (err) {
        console.error("Error fetching synopsis:", err);
        if (active) {
          setSynopsis("Could not load description.");
        }
      } finally {
        if (active) {
          setIsLoading(false);

          // Reconcile once: backfill a missing year or cover silently, and
          // surface anything that disagrees with what's stored as one
          // combined "mismatch found" banner instead of separate flows. If
          // the poster is missing AND the lookup found nothing at all — no
          // title, no year, no cover — that's usually because the stored
          // title didn't match anything, not a fluke of a missing image.
          const mismatch: { title?: string; year?: number; coverImage?: string } = {};
          const autoUpdates: Partial<WatchlistItem> = {};

          if (foundYear != null) {
            if (item.year == null) {
              autoUpdates.year = foundYear;
            } else if (item.year !== foundYear) {
              mismatch.year = foundYear;
            }
          }
          if (foundTitle && foundTitle.trim().toLowerCase() !== item.title.trim().toLowerCase()) {
            mismatch.title = foundTitle;
            // Only bundle the found cover with the title fix — applying a
            // "found via a different title" poster on its own, without also
            // correcting the title, would be confusing.
            if (foundCover && !item.coverImage) mismatch.coverImage = foundCover;
          } else if (foundCover && !item.coverImage) {
            autoUpdates.coverImage = foundCover;
          }

          if (Object.keys(autoUpdates).length > 0) {
            updateWatchItem(item, autoUpdates);
            if (autoUpdates.year != null) setDisplayYear(autoUpdates.year);
            if (autoUpdates.coverImage) setDisplayCover(autoUpdates.coverImage);
          }
          if (Object.keys(mismatch).length > 0) {
            setDiscrepancy(mismatch);
          } else if (!item.coverImage && !foundTitle && !foundYear && !foundCover) {
            setNoMatchFound(true);
          }
        }
      }
    };

    fetchSynopsis();

    return () => {
      active = false;
    };
    // updateWatchItem intentionally omitted: it's a prop from a large parent
    // component and isn't memoized there, so it gets a new identity on every
    // parent render. Calling it inside this effect (for the auto-fix) causes
    // a parent re-render → new updateWatchItem reference → effect re-fires →
    // calls it again — an infinite refetch loop. We only want this effect to
    // re-run when the user actually opens a different item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, user.idToken]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex w-[500px] max-w-[90%] flex-col gap-4 rounded-card border border-border-subtle bg-[#f4f3ec] p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] text-text-primary relative max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4.5 right-4.5 cursor-pointer border-none bg-transparent p-1 text-base text-text-secondary hover:text-text-primary transition-colors"
        >
          ✕
        </button>

        {/* Modal Content Layout */}
        <div className="flex gap-5 max-sm:flex-col">
          {/* Left Column: Poster / Cover */}
          <div className="w-32 shrink-0 max-sm:mx-auto relative">
            {isSafeImageUrl(displayCover) ? (
              <>
                <img src={displayCover} alt={displayTitle} className="w-full rounded-lg shadow-sm object-cover aspect-[2/3]" />
                {item.type === "book" && (
                  <div className="absolute inset-y-0 left-0 w-2.5 bg-linear-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />
                )}
              </>
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-bg-secondary text-4xl shadow-sm">
                {item.type === "movie" ? "🎬" : item.type === "show" ? "📺" : item.type === "anime" ? "🌸" : "📚"}
              </div>
            )}
          </div>

          {/* Right Column: Metadata & Synopsis */}
          <div className="flex-1 min-w-0 pr-6">
            <span className="inline-block rounded bg-[#eae8e0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
              {item.type === "movie" ? "Movie" : item.type === "show" ? "TV Show" : item.type === "anime" ? "Anime" : "Book"}
            </span>

            {isEditing ? (
              <div className="mt-2.5 flex flex-col gap-2">
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold text-text-muted uppercase">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold text-text-muted uppercase">
                    {item.type === "book" ? "Published Year" : "Release Year"}
                  </label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    placeholder="e.g. 2024"
                    className="w-full rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold text-text-muted uppercase">Cover Image URL</label>
                  <input
                    type="text"
                    value={editCover}
                    onChange={(e) => setEditCover(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-border-subtle bg-bg-card px-2.5 py-1.5 text-[12.5px] text-text-primary outline-none transition-all focus:border-border-hover focus:shadow-focus"
                  />
                </div>
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={handleSaveCorrection}
                    disabled={!editTitle.trim()}
                    className="cursor-pointer rounded-md border border-text-primary bg-text-primary px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditTitle(displayTitle);
                      setEditYear(displayYear != null ? String(displayYear) : "");
                      setEditCover(displayCover || "");
                      setIsEditing(false);
                    }}
                    className="cursor-pointer rounded-md border border-border-subtle bg-transparent px-3 py-1.5 text-[11px] font-semibold text-text-primary transition-all hover:bg-bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-col items-start gap-1.5">
                <h3 className="text-[15px] font-bold leading-tight font-serif tracking-tight text-text-primary break-words">
                  {displayTitle}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  title="Spotted a wrong title, year, or cover? Fix it here."
                  className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border-subtle bg-transparent px-2 py-1 text-[10px] font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                >
                  <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
                  Fix info
                </button>
              </div>
            )}
            {director && (
              <p className="text-[11.5px] text-text-secondary mt-1.5 font-medium">
                Director: <span className="text-text-primary font-semibold">{director}</span>
              </p>
            )}
            {author && (
              <p className="text-[11.5px] text-text-secondary mt-1.5 font-medium">
                Author: <span className="text-text-primary font-semibold">{author}</span>
              </p>
            )}
            {!isEditing && displayYear && (
              <p className="text-[11px] text-text-muted mt-1.5">
                {item.type === "book" ? "Published:" : "Release Year:"} {displayYear}
              </p>
            )}
            {!isEditing && !displayYear && (
              <p className="text-[11px] text-[#b3666b] mt-1.5">
                Year missing — <button onClick={() => setIsEditing(true)} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-[#b3666b] underline">add it</button>
              </p>
            )}
            {!isEditing && discrepancy && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2 text-[10.5px] text-[#92400e]">
                <span className="font-semibold">⚠️ Mismatch found vs. the source data:</span>
                <ul className="ml-3.5 list-disc">
                  {discrepancy.title && (
                    <li>Title: <span className="line-through opacity-70">{displayTitle}</span> → <span className="font-semibold">{discrepancy.title}</span></li>
                  )}
                  {discrepancy.year != null && (
                    <li>Year: <span className="line-through opacity-70">{displayYear}</span> → <span className="font-semibold">{discrepancy.year}</span></li>
                  )}
                  {discrepancy.coverImage && (
                    <li>Poster: <span className="font-semibold">found</span> — the missing cover was likely because the old title didn't match anything</li>
                  )}
                </ul>
                <div className="mt-0.5 flex gap-1.5">
                  <button
                    onClick={applyDiscrepancyFix}
                    className="cursor-pointer rounded border-none bg-[#92400e] px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    Auto-fix
                  </button>
                  <button
                    onClick={() => setDiscrepancy(null)}
                    className="cursor-pointer rounded border border-[#fde68a] bg-transparent px-2 py-1 text-[10px] font-semibold text-[#92400e]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            {!isEditing && noMatchFound && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2.5 py-2 text-[10.5px] text-[#991b1b]">
                <span>
                  ⚠️ No poster, and no match found online for &ldquo;{displayTitle}&rdquo; either — the stored title is likely misspelled or wrong.
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-fit cursor-pointer rounded border-none bg-[#991b1b] px-2 py-1 text-[10px] font-semibold text-white"
                >
                  Correct the title
                </button>
              </div>
            )}

            {/* Status & Rating */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-b border-border-subtle py-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Status:</span>
                <span className="font-semibold capitalize">
                  {item.status === "watching" && item.type === "book" ? "Reading" : item.status.replace(/_/g, " ")}
                </span>
              </div>
              {(item.type === "show" || item.type === "anime") && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Progress:</span>
                  <span className="font-mono font-semibold">
                    Ep {item.progress || 0}{item.totalEpisodes ? ` / ${item.totalEpisodes}` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Rating:</span>
                <span className="font-semibold">
                  {item.rating ? `★ ${item.rating} / 10` : "No rating yet"}
                </span>
              </div>
            </div>

            {/* Synopsis Section */}
            <div className="mt-4">
              <h4 className="font-serif text-[12px] font-bold text-text-primary">Synopsis</h4>
              <div className="mt-1.5 max-h-[160px] overflow-y-auto pr-1 text-[11.5px] leading-[1.6] text-text-secondary whitespace-pre-line">
                {isLoading ? (
                  <span className="text-text-muted italic">Fetching synopsis...</span>
                ) : (
                  synopsis
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 text-[9.5px] text-text-muted flex flex-col gap-1 border-t border-border-subtle pt-3">
              <p>Last Updated: {new Date(item.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              {item.anilistId && (
                <p>AniList ID: <span className="font-mono">{item.anilistId}</span></p>
              )}
              {item.traktId && (
                <p>Trakt ID: <span className="font-mono">{item.traktId}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
