import { safeLocalStorage } from "@/lib/utils/storage";

const CACHE_PREFIX = "phub_swr_";

export function readUserCache<T>(uid: string, key: string): T | null {
  if (!uid) return null;
  try {
    const raw = safeLocalStorage.getItem(`${CACHE_PREFIX}${uid}_${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeUserCache<T>(uid: string, key: string, data: T): void {
  if (!uid) return;
  try {
    safeLocalStorage.setItem(`${CACHE_PREFIX}${uid}_${key}`, JSON.stringify(data));
  } catch {}
}

export function clearAllUserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}
