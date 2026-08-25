import { Session } from "@/lib/auth";
import { FirestoreClient } from "../firebase-client";
import { WatchlistItem, WatchlistItemSchema } from "@/lib/validators/watchlist.schema";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/cache";

const WATCHLIST_CACHE_TTL = 3_600_000;

export class WatchlistService {
  private client: FirestoreClient;

  constructor(private session: Session) {
    this.client = new FirestoreClient(session);
  }

  private get cacheKey(): string {
    return `watchlist:${this.session.config.projectId}:${this.session.uid}`;
  }

  async list(): Promise<WatchlistItem[]> {
    const cached = await cacheGet<WatchlistItem[]>(this.cacheKey);
    if (cached) return cached;

    const rows = await this.client.runOwnedQuery("watchlist");
    const items: WatchlistItem[] = rows.map(({ id, data }) => ({
      id,
      title: (data.title as string) || "",
      type: (data.type as any) || "show",
      status: (data.status as any) || "plan_to_watch",
      progress: typeof data.progress === "number" ? data.progress : 0,
      totalEpisodes: typeof data.totalEpisodes === "number" ? data.totalEpisodes : null,
      rating: typeof data.rating === "number" ? data.rating : null,
      coverImage: (data.coverImage as string) || null,
      year: typeof data.year === "number" ? data.year : null,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
      createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
      anilistId: typeof data.anilistId === "number" ? data.anilistId : null,
      traktId: typeof data.traktId === "number" ? data.traktId : null,
    }));

    await cacheSet(this.cacheKey, items, WATCHLIST_CACHE_TTL);
    return items;
  }

  async invalidateCache(): Promise<void> {
    await cacheInvalidate(this.cacheKey);
  }
}
