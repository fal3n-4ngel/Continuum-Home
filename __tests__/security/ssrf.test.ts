import { describe, it, expect } from "vitest";
import { resolveTraktUrl } from "@/app/api/(integrations)/trakt/proxy/route";

const AMFI_SCHEME_CODE = /^\d{1,10}$/;
const YAHOO_TICKER = /^[A-Z0-9.^=-]{1,20}$/;

describe("Security Invariant: Adversarial SSRF Regression Suite", () => {
  describe("Trakt API Proxy Path Hardening", () => {
    it("permits legitimate allowed Trakt endpoints", () => {
      const allowedPaths = [
        "/users/me/history",
        "/sync/watchlist",
        "/search/movie?query=inception",
        "/shows/popular",
        "/movies/trending",
      ];

      for (const p of allowedPaths) {
        const url = resolveTraktUrl(p);
        expect(url.origin).toBe("https://api.trakt.tv");
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe("api.trakt.tv");
      }
    });

    it("rejects protocol-relative URLs aiming to escape the upstream origin", () => {
      const attackVectors = [
        "//169.254.169.254/latest/meta-data",
        "//localhost:3000/api/admin",
        "//127.0.0.1/internal",
        "//[::1]/secret",
        "//attacker.com/sync/",
      ];

      for (const vector of attackVectors) {
        expect(() => resolveTraktUrl(vector)).toThrow();
      }
    });

    it("rejects backslash and path traversal vectors", () => {
      const attackVectors = [
        "/\\169.254.169.254/users/",
        "/users/..\\../admin",
        "/users/../../etc/passwd",
        "/sync/../..//internal",
        "/search/..",
      ];

      for (const vector of attackVectors) {
        expect(() => resolveTraktUrl(vector)).toThrow();
      }
    });

    it("rejects control characters, newlines, and whitespace injection", () => {
      const attackVectors = [
        "/users/\r\nHost: evil.com",
        "/users/\x00evil",
        "/users/\x1fadmin",
        "/users/ with space",
        "/users/\t/tab",
      ];

      for (const vector of attackVectors) {
        expect(() => resolveTraktUrl(vector)).toThrow();
      }
    });

    it("rejects non-allowlisted endpoint prefixes", () => {
      const disallowedPaths = [
        "/admin/metrics",
        "/internal/config",
        "/v2/accounts",
        "/auth/session",
        "/settings/profile",
      ];

      for (const p of disallowedPaths) {
        expect(() => resolveTraktUrl(p)).toThrowError("This Trakt endpoint is not allowed.");
      }
    });

    it("rejects absolute URLs and foreign schemes", () => {
      const foreignSchemes = [
        "https://api.trakt.tv/users/me",
        "http://api.trakt.tv/users/me",
        "file:///etc/passwd",
        "gopher://127.0.0.1:25",
        "ftp://attacker.com/users/",
      ];

      for (const scheme of foreignSchemes) {
        expect(() => resolveTraktUrl(scheme)).toThrowError("'path' must be a string starting with '/'.");
      }
    });
  });

  describe("Financial Data Upstream Validation", () => {
    it("strictly accepts valid numeric AMFI mutual fund scheme codes", () => {
      expect(AMFI_SCHEME_CODE.test("118989")).toBe(true);
      expect(AMFI_SCHEME_CODE.test("105758")).toBe(true);
      expect(AMFI_SCHEME_CODE.test("1234567890")).toBe(true);
    });

    it("rejects malformed, path-traversal, or injection AMFI scheme codes", () => {
      const maliciousSchemeCodes = [
        "118989/../../etc/passwd",
        "118989?format=json&proxy=http://169.254.169.254",
        "scheme-123",
        "-118989",
        "118989;DROP TABLE users;",
        "118989\r\nHost: attacker.com",
        "118989<script>",
        "12345678901",
      ];

      for (const code of maliciousSchemeCodes) {
        expect(AMFI_SCHEME_CODE.test(code)).toBe(false);
      }
    });

    it("strictly accepts valid Yahoo Finance ticker patterns", () => {
      expect(YAHOO_TICKER.test("AAPL")).toBe(true);
      expect(YAHOO_TICKER.test("RELIANCE.NS")).toBe(true);
      expect(YAHOO_TICKER.test("^NSEI")).toBe(true);
      expect(YAHOO_TICKER.test("BTC-USD")).toBe(true);
    });

    it("rejects SSRF payloads and command injection in Yahoo tickers", () => {
      const maliciousTickers = [
        "AAPL/../../internal",
        "http://169.254.169.254",
        "AAPL;curl attacker.com",
        "AAPL&rm -rf /",
        "AAPL $(whoami)",
        "AAPL`cat /etc/passwd`",
        "RELIANCE.NS\n",
        "VERYLONGTICKERNAMETHATEXCEEDSTWENTYCHARACTERS",
      ];

      for (const ticker of maliciousTickers) {
        expect(YAHOO_TICKER.test(ticker)).toBe(false);
      }
    });
  });
});
