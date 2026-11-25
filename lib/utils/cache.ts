import { redis } from "./redis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_LOCAL_ENTRIES = 500;
const localStore = new Map<string, CacheEntry<unknown>>();

function localGet<T>(key: string): T | undefined {
  const entry = localStore.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    localStore.delete(key);
    return undefined;
  }
  localStore.delete(key);
  localStore.set(key, entry);
  return entry.value as T;
}

function localSet<T>(key: string, value: T, ttlMs: number): void {
  if (localStore.has(key)) {
    localStore.delete(key);
  } else if (localStore.size >= MAX_LOCAL_ENTRIES) {
    const oldestKey = localStore.keys().next().value;
    if (oldestKey !== undefined) localStore.delete(oldestKey);
  }
  localStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (redis) {
    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        return data;
      }
      return undefined;
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("Redis get error:", err);
      }
    }
  }

  return localGet<T>(key);
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, value, { px: ttlMs });
      localStore.delete(key);
      return;
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("Redis set error:", err);
      }
    }
  }

  localSet(key, value, ttlMs);
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
