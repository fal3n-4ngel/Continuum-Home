/**
 * Safe in-memory fallback store when localStorage / sessionStorage
 * is disabled, blocked by Safari Private Browsing, webview sandboxes,
 * or when storage quota is exceeded.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.store.set(String(key), String(value));
  }
}

function createSafeStorage(type: "localStorage" | "sessionStorage"): Storage {
  const memoryFallback = new MemoryStorage();

  return {
    get length(): number {
      try {
        if (typeof window !== "undefined" && window[type]) {
          return window[type].length;
        }
      } catch {}
      return memoryFallback.length;
    },

    clear(): void {
      try {
        if (typeof window !== "undefined" && window[type]) {
          window[type].clear();
        }
      } catch {}
      memoryFallback.clear();
    },

    getItem(key: string): string | null {
      try {
        if (typeof window !== "undefined" && window[type]) {
          const val = window[type].getItem(key);
          if (val !== null) return val;
        }
      } catch {}
      return memoryFallback.getItem(key);
    },

    key(index: number): string | null {
      try {
        if (typeof window !== "undefined" && window[type]) {
          return window[type].key(index);
        }
      } catch {}
      return memoryFallback.key(index);
    },

    removeItem(key: string): void {
      try {
        if (typeof window !== "undefined" && window[type]) {
          window[type].removeItem(key);
        }
      } catch {}
      memoryFallback.removeItem(key);
    },

    setItem(key: string, value: string): void {
      try {
        if (typeof window !== "undefined" && window[type]) {
          window[type].setItem(key, String(value));
        }
      } catch {
        // Handle QuotaExceededError or SecurityError in private browsing
      }
      memoryFallback.setItem(key, value);
    },
  };
}

export const safeLocalStorage = createSafeStorage("localStorage");
export const safeSessionStorage = createSafeStorage("sessionStorage");
