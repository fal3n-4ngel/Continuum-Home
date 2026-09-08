import { redis } from "./redis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const localStore = new Map<string, CacheEntry<unknown>>();

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const localEntry = localStore.get(key);
  if (localEntry && Date.now() <= localEntry.expiresAt) {
    return localEntry.value as T;
  }

  if (redis) {
    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        localStore.set(key, { value: data, expiresAt: Date.now() + 30_000 });
        return data;
      }
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("Redis get error:", err);
      }
    }
  }
  return undefined;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  localStore.set(key, { value, expiresAt: Date.now() + ttlMs });

  if (redis) {
    try {
      await redis.set(key, value, { px: ttlMs });
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("Redis set error:", err);
      }
    }
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  localStore.delete(key);
  if (redis) {
    try {
      await redis.del(key);
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("Redis del error:", err);
      }
    }
  }
}
