import { anilistQuery, TO_ANILIST_STATUS_MAP, traktRequest } from "@/lib/integrations";
import { WatchlistItem } from "./firebase";

export async function pushWatchlistUpdate(
  idToken: string | undefined,
  item: WatchlistItem,
  updates: Partial<WatchlistItem>
): Promise<void> {
  const finalItem = { ...item, ...updates };

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
          variables.score = Number(finalItem.rating);
        }

        const result = await anilistQuery(query, variables, anilistToken);
        if (result?.errors?.length) {
          throw new Error(result.errors.map((e: any) => e.message).join("; "));
        }
        console.log(`Successfully pushed AniList update for: ${item.title}`);
      } catch (err) {
        console.error("Failed to push update to AniList:", err);
      }
    }
  }

  if (item.traktId && (item.type === "movie" || item.type === "show" || item.type === "anime")) {
    const traktAccessToken = localStorage.getItem("trakt_access_token");
    if (traktAccessToken) {
      try {
        if (updates.status === "completed" || (updates.progress && finalItem.status === "completed")) {
          if (item.type === "movie") {
            await traktRequest(idToken, "sync/history", {
              method: "POST",
              token: traktAccessToken,
              body: { movies: [{ ids: { trakt: Number(item.traktId) } }] },
            });
          } else {
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
                    : { ids: { trakt: Number(item.traktId) } },
                ],
              },
            });
          }
          console.log(`Successfully pushed watch history update to Trakt for: ${item.title}`);
        }

        if (updates.status === "plan_to_watch") {
          const bodyKey = item.type === "movie" ? "movies" : "shows";
          await traktRequest(idToken, "sync/watchlist", {
            method: "POST",
            token: traktAccessToken,
            body: { [bodyKey]: [{ ids: { trakt: Number(item.traktId) } }] },
          });
          console.log(`Successfully pushed watchlist addition to Trakt for: ${item.title}`);
        }

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
