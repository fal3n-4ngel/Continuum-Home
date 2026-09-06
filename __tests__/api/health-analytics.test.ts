// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/assistant/health-analytics/route";
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
    getHealthAnalytics: vi.fn(),
    saveHealthAnalytics: vi.fn(),
  };
});

vi.mock("@/lib/integrations", () => ({
  acquireGenerationLock: vi.fn().mockResolvedValue(true),
  reserveGeminiCall: vi.fn().mockResolvedValue(true),
  isGeminiQuotaError: vi.fn().mockReturnValue(false),
}));

describe("GET /api/assistant/health-analytics", () => {
  const mockSession = {
    uid: "test-user-123",
    user: { email: "test@example.com" },
    config: { projectId: "test-project" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireUser).mockResolvedValue(mockSession as any);
  });

  it("returns cached report without calling Gemini when fingerprint matches and report is fresh", async () => {
    const fingerprint = "2026-09-01_spent:20000_proj:40000_prev:35000_cats:{}";
    const freshReport: firebase.HealthAnalyticsReport = {
      trendStatus: "+5% vs last cycle (Balanced Pace)",
      trendSeverity: "good",
      executiveSummary: "Your monthly spending velocity is balanced.",
      topCategories: [{ category: "Food", amount: 12000, percentage: 60 }],
      spendTrends: ["Food spend steady"],
      anomalies: ["No major spikes"],
      savingOpportunities: ["Set aside target savings"],
      safeSpendAdvice: "Spend under 500 daily.",
      fingerprint,
      updatedAt: Date.now() - 3600 * 1000, // 1 hour ago
    };

    vi.mocked(firebase.getHealthAnalytics).mockResolvedValue(freshReport);

    const req = new NextRequest(
      "http://localhost:3000/api/assistant/health-analytics?startStr=2026-09-01&spentSoFar=20000&projectedTotalSpend=40000&prevCycleSpend=35000"
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.cached).toBe(true);
    expect(data.updated).toBe(false);
    expect(data.report.trendStatus).toBe("+5% vs last cycle (Balanced Pace)");
  });
});
