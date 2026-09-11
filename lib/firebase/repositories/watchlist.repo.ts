import { randomUUID } from "crypto";
import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";
import {
  assertDocId,
  docsRoot,
  docName,
  fsFetch,
  FirestoreDocument,
  toFields,
  fromFields,
  runOwnedQuery,
  userPath,
} from "../client";

export interface WatchlistItem {
  id?: string;
  title: string;
  type: "movie" | "show" | "anime" | "book";
  status: "plan_to_watch" | "watching" | "completed" | "dropped" | "paused";
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  updatedAt: number;
  createdAt: number;
  anilistId?: number | null;
  traktId?: number | null;
}

export interface SyncEntry {
  title: string;
  type: WatchlistItem["type"];
  status: WatchlistItem["status"];
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  anilistId?: number | null;
  traktId?: number | null;
}

export type SyncSource = "anilist" | "trakt" | "letterboxd" | "manual" | string;

const WATCHLIST_CACHE_TTL = 3_600_000;

export function watchlistCacheKey(session: Session): string {
  return `watchlist:${session.config.projectId}:${session.uid}`;
}

export async function writeWatchlistItems(
  session: Session,
  patches: Record<string, Record<string, unknown> | null>,
  wholeItemIds?: Set<string>
): Promise<void> {
  const fieldPaths: string[] = [];
  const items: Record<string, unknown> = {};

  for (const [id, patch] of Object.entries(patches)) {
    assertDocId(id, "watchlist item");
    if (patch === null) {
      fieldPaths.push(`items.\`${id}\``);
    } else if (wholeItemIds?.has(id)) {
      fieldPaths.push(`items.\`${id}\``);
      items[id] = patch;
    } else {
      for (const key of Object.keys(patch)) {
        if (patch[key] === undefined) continue;
        fieldPaths.push(`items.\`${id}\`.${key}`);
      }
      items[id] = patch;
    }
  }

  if (fieldPaths.length === 0) return;

  const body = {
    writes: [
      {
        update: {
          name: docName(session, "watchlists", session.uid),
          fields: toFields({ items }),
        },
        updateMask: { fieldPaths },
      },
      {
        update: {
          name: docName(session, "users", session.uid, "watchlists", "default"),
          fields: toFields({ items }),
        },
        updateMask: { fieldPaths },
      },
    ],
  };

  await fsFetch(session, `${docsRoot(session)}:commit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function migrateLegacyWatchlist(session: Session): Promise<Record<string, WatchlistItem>> {
  const rows = await runOwnedQuery(session, "watchlist");
  if (rows.length === 0) return {};

  const items: Record<string, WatchlistItem> = {};
  rows.forEach(({ id, data }) => {
    items[id] = {
      title: (data.title as string) || "Untitled",
      type: (data.type as WatchlistItem["type"]) || "movie",
      status: (data.status as WatchlistItem["status"]) || "plan_to_watch",
      progress: typeof data.progress === "number" ? data.progress : 0,
      totalEpisodes: typeof data.totalEpisodes === "number" ? data.totalEpisodes : null,
      rating: typeof data.rating === "number" ? data.rating : null,
      coverImage: (data.coverImage as string) || null,
      year: typeof data.year === "number" ? data.year : null,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : (typeof data.updatedAt === "number" ? data.updatedAt : 0),
      anilistId: typeof data.anilistId === "number" ? data.anilistId : null,
      traktId: typeof data.traktId === "number" ? data.traktId : null,
    };
  });

  await writeWatchlistItems(session, items as unknown as Record<string, Record<string, unknown>>, new Set(Object.keys(items)));
  return items;
}

export async function getRawWatchlist(session: Session): Promise<Record<string, WatchlistItem>> {
  const cacheKey = watchlistCacheKey(session);
  const cached = await cacheGet<Record<string, WatchlistItem>>(cacheKey);
  if (cached) return cached;

  let items: Record<string, WatchlistItem>;
  try {
    let snap: FirestoreDocument;
    try {
      snap = await fsFetch<FirestoreDocument>(session, userPath(session, "watchlists", "default"));
    } catch (subErr) {
      if (subErr instanceof ApiError && subErr.status === 404) {
        snap = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/watchlists/${session.uid}`);
      } else {
        throw subErr;
      }
    }
    items = (fromFields(snap.fields).items as Record<string, WatchlistItem>) || {};
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      items = await migrateLegacyWatchlist(session);
    } else {
      throw error;
    }
  }

  await cacheSet(cacheKey, items, WATCHLIST_CACHE_TTL);
  return items;
}

export async function listWatchlist(session: Session): Promise<WatchlistItem[]> {
  const itemsMap = await getRawWatchlist(session);
  const items = Object.entries(itemsMap)
    .map(([id, data]) => ({
      ...data,
      id,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : data.updatedAt,
    }))
    .filter((item) => typeof item.title === "string" && item.title.length > 0);
  items.sort((a, b) => b.updatedAt - a.updatedAt);
  return items;
}

export async function addWatchlistItem(session: Session, item: Omit<WatchlistItem, "id" | "updatedAt" | "createdAt">) {
  const id = randomUUID();
  const now = Date.now();
  const docData = { ...item, updatedAt: now, createdAt: now };

  await writeWatchlistItems(session, { [id]: docData as unknown as Record<string, unknown> }, new Set([id]));
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}

export async function updateWatchlistItem(
  session: Session,
  id: string,
  item: Partial<Omit<WatchlistItem, "id" | "updatedAt" | "createdAt">>
) {
  const patch: Record<string, unknown> = { ...item, updatedAt: Date.now() };
  Object.keys(patch).forEach((key) => {
    if (patch[key] === undefined) delete patch[key];
  });

  await writeWatchlistItems(session, { [id]: patch });
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}

function normalizeTitle(title: string): string {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function bulkSyncWatchlist(
  session: Session,
  source: SyncSource,
  entries: SyncEntry[]
): Promise<{ added: number; updated: number; skipped: number }> {
  const idField = source === "anilist" ? "anilistId" : source === "trakt" ? "traktId" : null;

  const itemsMap = await getRawWatchlist(session);
  const existingByExternalId = new Map<number, { id: string; item: WatchlistItem }>();
  const existingByTitleType = new Map<string, { id: string; item: WatchlistItem }>();

  Object.entries(itemsMap).forEach(([id, item]) => {
    if (idField) {
      const extId = item[idField];
      if (extId !== undefined && extId !== null) {
        existingByExternalId.set(Number(extId), { id, item });
      }
    }
    if (item.title && item.type) {
      const key = `${item.type.toLowerCase()}:${normalizeTitle(item.title)}`;
      existingByTitleType.set(key, { id, item });
    }
  });

  let added = 0, updated = 0, skipped = 0;
  const now = Date.now();
  const patches: Record<string, Record<string, unknown> | null> = {};
  const newIds = new Set<string>();

  for (const entry of entries) {
    const extId = source === "anilist" ? entry.anilistId : source === "trakt" ? entry.traktId : null;
    let match = extId !== undefined && extId !== null ? existingByExternalId.get(Number(extId)) : undefined;

    if (!match && entry.title && entry.type) {
      const key = `${entry.type.toLowerCase()}:${normalizeTitle(entry.title)}`;
      match = existingByTitleType.get(key);
    }

    if (match) {
      const totalEp = entry.totalEpisodes !== undefined && entry.totalEpisodes !== null
        ? Number(entry.totalEpisodes)
        : (match.item.totalEpisodes !== undefined && match.item.totalEpisodes !== null ? Number(match.item.totalEpisodes) : null);
      const prog = entry.progress !== undefined && entry.progress !== null
        ? Number(entry.progress)
        : (match.item.progress !== undefined && match.item.progress !== null ? Number(match.item.progress) : 0);

      let finalStatus = entry.status;
      if (totalEp && totalEp > 0 && prog >= totalEp) {
        finalStatus = "completed";
      }

      const changed =
        match.item.status !== finalStatus ||
        Number(match.item.progress || 0) !== Number(entry.progress || 0) ||
        Number(match.item.rating || 0) !== Number(entry.rating || 0) ||
        (entry.coverImage && match.item.coverImage !== entry.coverImage);

      if (!changed) {
        skipped++;
        continue;
      }

      patches[match.id] = {
        status: finalStatus,
        progress: entry.progress,
        rating: entry.rating,
        ...(entry.coverImage ? { coverImage: entry.coverImage } : {}),
        updatedAt: now,
      };
      updated++;
    } else {
      const id = randomUUID();
      const totalEp = entry.totalEpisodes !== undefined && entry.totalEpisodes !== null ? Number(entry.totalEpisodes) : null;
      const prog = entry.progress !== undefined && entry.progress !== null ? Number(entry.progress) : 0;

      let finalStatus = entry.status;
      if (totalEp && totalEp > 0 && prog >= totalEp) {
        finalStatus = "completed";
      }

      patches[id] = {
        title: entry.title,
        type: entry.type,
        status: finalStatus,
        progress: entry.progress,
        totalEpisodes: entry.totalEpisodes,
        rating: entry.rating,
        coverImage: entry.coverImage,
        year: entry.year,
        anilistId: entry.anilistId ?? null,
        traktId: entry.traktId ?? null,
        updatedAt: now,
        createdAt: now,
      };
      newIds.add(id);
      added++;
    }
  }

  await writeWatchlistItems(session, patches, newIds);
  await cacheInvalidate(watchlistCacheKey(session));
  return { added, updated, skipped };
}

export async function deleteWatchlistItem(session: Session, id: string) {
  await writeWatchlistItems(session, { [id]: null });
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}
