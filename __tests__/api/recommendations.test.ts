// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/assistant/recommendations/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/auth";
import * as firebase from "@/lib/firebase";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/firebase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firebase")>();
  return {
    ...actual,
    getDailyRecommendation: vi.fn(),
    saveDailyRecommendation: vi.fn(),
    listWatchlist: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/lib/integrations", () => ({
  acquireGenerationLock: vi.fn().mockResolvedValue(true),
  reserveGeminiCall: vi.fn().mockResolvedValue(true),
  isGeminiQuotaError: vi.fn().mockReturnValue(false),
}));

describe("Recommendations API SSRF and Input Validation", () => {
  const mockSession = {
    uid: "test-user-123",
    user: { email: "test@example.com" },
    config: { projectId: "test-project" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireUser).mockResolvedValue(mockSession as any);
  });

  describe("GET /api/assistant/recommendations", () => {
    it("rejects malicious or invalid type parameters with HTTP 400", async () => {
      const maliciousTypes = [
        "http://evil.com",
        "../../etc/passwd",
        "podcast",
        "video",
        "<script>",
      ];

      for (const badType of maliciousTypes) {
        const req = new NextRequest(`http://localhost:3000/api/assistant/recommendations?type=${encodeURIComponent(badType)}`);
        const res = await GET(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.message).toContain("Invalid type");
      }
    });

    it("accepts valid types and returns cached recommendation when available", async () => {
      const mockRec: firebase.DailyRecommendation = {
        type: "movie",
        title: "Inception",
        releaseYear: "2010",
        synopsis: "A thief who steals corporate secrets.",
        rationale: "Great mind-bending sci-fi.",
        coverImage: "https://example.com/poster.jpg",
        score: "8.8",
        isLogged: false,
        date: "2026-09-09",
      };

      vi.mocked(firebase.getDailyRecommendation).mockResolvedValue(mockRec);

      const req = new NextRequest("http://localhost:3000/api/assistant/recommendations?type=movie");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.recommendation.title).toBe("Inception");
    });
  });

  describe("POST /api/assistant/recommendations", () => {
    it("rejects invalid type with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/recommendations", {
        method: "POST",
        body: JSON.stringify({ type: "invalid_type", date: "2026-09-09", isLogged: true }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("Invalid type");
    });

    it("rejects invalid date format with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/assistant/recommendations", {
        method: "POST",
        body: JSON.stringify({ type: "movie", date: "not-a-date", isLogged: true }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("Invalid date format");
    });

    it("updates recommendation successfully when type and date are valid", async () => {
      const existingRec: firebase.DailyRecommendation = {
        type: "book",
        title: "Dune",
        releaseYear: "1965",
        author: "Frank Herbert",
        synopsis: "Desert planet epic.",
        rationale: "Classic sci-fi.",
        coverImage: null,
        score: null,
        isLogged: false,
        date: "2026-09-09",
      };

      vi.mocked(firebase.getDailyRecommendation).mockResolvedValue(existingRec);
      vi.mocked(firebase.saveDailyRecommendation).mockResolvedValue();

      const req = new NextRequest("http://localhost:3000/api/assistant/recommendations", {
        method: "POST",
        body: JSON.stringify({ type: "book", date: "2026-09-09", isLogged: true }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(existingRec.isLogged).toBe(true);
    });
  });
});
