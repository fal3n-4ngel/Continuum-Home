import { anilistQuery, TO_ANILIST_STATUS_MAP, traktRequest } from "@/lib/integrations";
import { WatchlistItem } from "./firebase";

/**
 * Pushes updates made locally in the dashboard back to AniList and Trakt
 */
export async function pushWatchlistUpdate(
  idToken: string | undefined,
  item: WatchlistItem,
  updates: Partial<WatchlistItem>
): Promise<void> {
  const finalItem = { ...item, ...updates };

  // ─── 1. AniList Push (Anime only) ───
  if (item.type === "anime" && item.anilistId) {
    const anilistToken = localStorage.getItem("anilist_token");
    if (anilistToken) {
      try {
        const query = `
          mutation($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
              id
              status
              progress
            }
          }
        `;

        const variables: Record<string, unknown> = {
          mediaId: Number(item.anilistId),
          status: TO_ANILIST_STATUS_MAP[finalItem.status] || "PLANNING",
          progress: finalItem.progress || 0,
        };

        if (finalItem.rating !== null && finalItem.rating !== undefined) {
          // AniList scores are out of 10 or 100 depending on account, standard mutation accepts float score
          variables.score = Number(finalItem.rating);
        }

        const result = await anilistQuery(query, variables, anilistToken);
        // AniList returns HTTP 200 even when a mutation fails at the
        // GraphQL layer (expired auth scope, invalid mediaId, etc.) — the
        // failure only shows up in the response body's `errors` array, so a
        // successful fetch() alone doesn't mean the update actually landed.
        if (result?.errors?.length) {
          throw new Error(result.errors.map((e: any) => e.message).join("; "));
        }
        console.log(`Successfully pushed AniList update for: ${item.title}`);
      } catch (err) {
        console.error("Failed to push update to AniList:", err);
      }
    }
  }

  // ─── 2. Trakt Push (Movies and Shows) ───
  if (item.traktId && (item.type === "movie" || item.type === "show" || item.type === "anime")) {
    const traktAccessToken = localStorage.getItem("trakt_access_token");
    if (traktAccessToken) {
      try {
        // If status changed to completed, add to watched history
        if (updates.status === "completed" || (updates.progress && finalItem.status === "completed")) {
          if (item.type === "movie") {
            await traktRequest(idToken, "sync/history", {
              method: "POST",
              token: traktAccessToken,
              body: { movies: [{ ids: { trakt: Number(item.traktId) } }] },
            });
          } else {
            // Mark every episode across every real season as watched.
            // Previously this assumed a single season and sliced episode
            // numbers 1..progress out of it — wrong for any multi-season
            // show, since a flat episode count doesn't map onto season
            // boundaries (e.g. progress=25 on a 3-season show would try to
            // mark episodes 11-25 of a season that might only have 10,
            // which Trakt rejects/ignores — exactly the "completed, but
            // Trakt never updates" symptom). Fetch the show's actual
            // season/episode structure instead of guessing.
            let seasons: { number: number; episodes: { number: number }[] }[] = [];
            try {
              const seasonsData = await traktRequest(idToken, `shows/${item.traktId}/seasons?extended=episodes`, { token: traktAccessToken });
              seasons = (Array.isArray(seasonsData) ? seasonsData : [])
                .filter((s: any) => s.number > 0 && Array.isArray(s.episodes) && s.episodes.length > 0)
                .map((s: any) => ({ number: s.number, episodes: s.episodes.map((e: any) => ({ number: e.number })) }));
            } catch (seasonErr) {
              console.error("Failed to fetch Trakt season data:", seasonErr);
            }

            await traktRequest(idToken, "sync/history", {
              method: "POST",
              token: traktAccessToken,
              body: {
                shows: [
                  seasons.length > 0
                    ? { ids: { trakt: Number(item.traktId) }, seasons }
                    // Season data unavailable — mark the show watched
                    // without episode-level detail rather than guessing
                    // wrong episode numbers.
                    : { ids: { trakt: Number(item.traktId) } },
                ],
              },
            });
          }
          console.log(`Successfully pushed watch history update to Trakt for: ${item.title}`);
        }

        // If status is plan_to_watch, add to Trakt watchlist
        if (updates.status === "plan_to_watch") {
          const bodyKey = item.type === "movie" ? "movies" : "shows";
          await traktRequest(idToken, "sync/watchlist", {
            method: "POST",
            token: traktAccessToken,
            body: { [bodyKey]: [{ ids: { trakt: Number(item.traktId) } }] },
          });
          console.log(`Successfully pushed watchlist addition to Trakt for: ${item.title}`);
        }

        // If status is changed from plan_to_watch to something else, remove from watchlist
        if (item.status === "plan_to_watch" && updates.status && updates.status !== "plan_to_watch") {
          const bodyKey = item.type === "movie" ? "movies" : "shows";
          await traktRequest(idToken, "sync/watchlist/remove", {
            method: "POST",
            token: traktAccessToken,
            body: { [bodyKey]: [{ ids: { trakt: Number(item.traktId) } }] },
          });
          console.log(`Successfully removed from Trakt watchlist: ${item.title}`);
        }
      } catch (err) {
        console.error("Failed to push update to Trakt:", err);
      }
    }
  }
}
