import { describe, it, expect, beforeEach, vi } from "vitest";
import { safeLocalStorage, safeSessionStorage } from "@/lib/utils/storage";

describe("safeLocalStorage & safeSessionStorage", () => {
  beforeEach(() => {
    safeLocalStorage.clear();
    safeSessionStorage.clear();
  });

  describe("standard storage operations", () => {
    it("stores and retrieves items correctly", () => {
      safeLocalStorage.setItem("test_key", "test_value");
      expect(safeLocalStorage.getItem("test_key")).toBe("test_value");

      safeSessionStorage.setItem("session_key", "session_value");
      expect(safeSessionStorage.getItem("session_key")).toBe("session_value");
    });

    it("returns null for non-existent keys", () => {
      expect(safeLocalStorage.getItem("non_existent_key")).toBeNull();
      expect(safeSessionStorage.getItem("non_existent_key")).toBeNull();
    });

    it("removes items cleanly", () => {
      safeLocalStorage.setItem("to_remove", "abc");
      expect(safeLocalStorage.getItem("to_remove")).toBe("abc");
      safeLocalStorage.removeItem("to_remove");
      expect(safeLocalStorage.getItem("to_remove")).toBeNull();
    });

    it("clears all items", () => {
      safeLocalStorage.setItem("k1", "v1");
      safeLocalStorage.setItem("k2", "v2");
      safeLocalStorage.clear();
      expect(safeLocalStorage.getItem("k1")).toBeNull();
      expect(safeLocalStorage.getItem("k2")).toBeNull();
    });
  });

  describe("mobile / restricted environment resilience", () => {
    it("handles QuotaExceededError or SecurityError on setItem without throwing", () => {
      // Mock window.localStorage.setItem to throw DOMException (like in Safari private browsing or low quota)
      const originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      });

      expect(() => {
        safeLocalStorage.setItem("quota_test", "still_accessible");
      }).not.toThrow();

      // In-memory fallback still delivers the data for the session
      expect(safeLocalStorage.getItem("quota_test")).toBe("still_accessible");

      window.localStorage.setItem = originalSetItem;
    });

    it("handles SecurityError on getItem without throwing and falls back to memory", () => {
      const originalGetItem = window.localStorage.getItem;
      window.localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      });

      expect(() => {
        const val = safeLocalStorage.getItem("insecure_test");
        expect(val).toBeNull();
      }).not.toThrow();

      window.localStorage.getItem = originalGetItem;
    });

    it("handles removeItem throwing SecurityError gracefully", () => {
      const originalRemove = window.localStorage.removeItem;
      window.localStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      });

      expect(() => {
        safeLocalStorage.removeItem("insecure_key");
      }).not.toThrow();

      window.localStorage.removeItem = originalRemove;
    });
  });
});
