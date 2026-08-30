import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Firebase Admin module globally for integration tests
vi.mock("@/lib/firebase/firebase-admin", () => ({
  getAdminDb: vi.fn().mockReturnValue(null),
  requireUser: vi.fn(),
  listAllUsers: vi.fn().mockResolvedValue([
    { uid: "admin123", email: "adiad.dev@gmail.com" },
    { uid: "user456", email: "user@example.com" },
  ]),
  adminListExpenses: vi.fn().mockResolvedValue([
    { id: "exp1", title: "Cloud Hosting", amount: 1500, category: "Infrastructure", date: "2026-08-01" },
    { id: "exp2", title: "Coffee", amount: 250, category: "Food", date: "2026-08-03" },
  ]),
  adminListSubscriptions: vi.fn().mockResolvedValue([
    { id: "sub1", name: "GitHub Copilot", cost: 10, billingCycle: "monthly", nextBillingDate: "2026-08-06", icon: "💻" },
  ]),
  adminGetPortfolio: vi.fn().mockResolvedValue({
    assets: [
      { name: "RELIANCE", category: "equity", quantity: 10, amount: 25000, buyPrice: 2500 },
      { name: "HDFC FD", category: "fixed_deposit", quantity: 1, amount: 100000, buyPrice: 100000, interestRate: 7, tenureMonths: 12, startDate: "2026-01-01" },
    ],
    valuationHistory: {},
  }),
  adminListWatchlist: vi.fn().mockResolvedValue([
    { id: "item1", title: "Inception", type: "movie", status: "completed", rating: 5 },
  ]),
  adminUpdatePortfolioValuationHistory: vi.fn().mockResolvedValue(true),
  adminSaveDailyRecommendation: vi.fn().mockResolvedValue(true),
  // Opted in to everything, matching the real "missing key means subscribed"
  // default — so cron tests exercise the send path rather than the skip path.
  adminGetEmailSubscriptions: vi.fn().mockResolvedValue({ expenses: true, portfolio: true, subscriptions: true }),
  adminSetEmailSubscriptions: vi.fn().mockResolvedValue(undefined),
}));

// Mock prices module
const mockPrice = { priceInr: 2600, priceUsd: 31.14, previousCloseInr: 2580, previousCloseUsd: 30.9 };
vi.mock("@/lib/prices", () => ({
  fetchAssetPrice: vi.fn().mockResolvedValue(mockPrice),
  // Mirrors the real factory's shape — the cron routes call this once per run
  // and pass the returned fetcher down into per-user processing.
  createPriceFetcher: vi.fn(() => vi.fn().mockResolvedValue(mockPrice)),
  getUsdToInrRate: vi.fn().mockResolvedValue(83.5),
}));

// Mock auth module
vi.mock("@/lib/auth", () => ({
  buildUnsubscribeUrl: vi.fn((email: string, topic: string) => `http://localhost:3000/api/unsubscribe?token=mocked_${topic}`),
  requireUser: vi.fn().mockImplementation(async (req: any) => {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader === "Bearer invalid") {
      throw { message: "Unauthorized", status: 401 };
    }
    return {
      user: {
        uid: "admin123",
        email: "adiad.dev@gmail.com",
      },
    };
  }),
}));
