import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { getRawExpenses, expenseCacheKey } from "@/lib/firebase/repositories/expenses.repo";
import { getPortfolio, portfolioCacheKey } from "@/lib/firebase/repositories/portfolio.repo";
import { encrypt } from "@/lib/utils";
import type { Session } from "@/lib/auth";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-encryption-key-for-zero-knowledge-cache-testing";
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

const mockSession: Session = {
  uid: "test-user-123",
  idToken: "mock-id-token",
  creds: {} as Session["creds"],
  user: { uid: "test-user-123", email: "test@example.com", displayName: "Test User" },
  config: {
    projectId: "test-project",
    apiKey: "mock-key",
    authDomain: "test-domain",
  },
};

const cacheStorage = new Map<string, unknown>();

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/utils");
  return {
    ...actual,
    cacheGet: vi.fn(async (key: string) => cacheStorage.get(key)),
    cacheSet: vi.fn(async (key: string, val: unknown) => {
      cacheStorage.set(key, val);
    }),
    cacheInvalidate: vi.fn(async (key: string) => {
      cacheStorage.delete(key);
    }),
  };
});

vi.mock("@/lib/firebase/client", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/firebase/client");
  return {
    ...actual,
    listSubcollectionDocs: vi.fn(async () => [
      {
        id: "exp_1",
        data: {
          title: encrypt("Taj Mahal Dinner"),
          amount: encrypt("4500"),
          category: encrypt("Food & Dining"),
          notes: encrypt("Team celebration dinner"),
          date: "2026-09-12",
          createdAt: 1726000000000,
        },
      },
    ]),
    runOwnedQuery: vi.fn(async () => []),
    fsFetch: vi.fn(async () => ({
      name: "projects/test-project/databases/(default)/documents/users/test-user-123/portfolio/summary",
      fields: {
        assets: {
          arrayValue: {
            values: [
              {
                mapValue: {
                  fields: {
                    id: { stringValue: "asset_1" },
                    name: { stringValue: encrypt("Nifty 50 Index Fund") },
                    category: { stringValue: encrypt("equity") },
                    amount: { stringValue: encrypt("50000") },
                    investedAmount: { stringValue: encrypt("45000") },
                  },
                },
              },
            ],
          },
        },
        updatedAt: { integerValue: "1726000000000" },
      },
    })),
    userPath: vi.fn((_session: Session, ...parts: string[]) => `users/test-user-123/${parts.join("/")}`),
    docsRoot: vi.fn(() => "projects/test-project/databases/(default)/documents"),
    assertDocId: vi.fn(),
  };
});

describe("Zero-Knowledge Redis & Memory Cache Layer", () => {
  beforeEach(() => {
    cacheStorage.clear();
    vi.clearAllMocks();
  });

  it("stores only ciphertext in cache for expenses and decrypts on retrieval", async () => {
    const key = expenseCacheKey(mockSession);
    expect(key).toContain("expenses:v2:");

    const firstRun = await getRawExpenses(mockSession);
    expect(firstRun).toHaveLength(1);
    expect(firstRun[0].title).toBe("Taj Mahal Dinner");
    expect(firstRun[0].amount).toBe(4500);

    const cachedPayload = cacheStorage.get(key) as Array<{ id: string; data: Record<string, unknown> }>;
    expect(cachedPayload).toBeDefined();
    expect(cachedPayload[0].id).toBe("exp_1");

    expect(cachedPayload[0].data.title).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(cachedPayload[0].data.amount).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(cachedPayload[0].data.category).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(cachedPayload[0].data.notes).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

    const serializedCache = JSON.stringify(cachedPayload);
    expect(serializedCache).not.toContain("Taj Mahal Dinner");
    expect(serializedCache).not.toContain("Team celebration dinner");

    const secondRun = await getRawExpenses(mockSession);
    expect(secondRun).toHaveLength(1);
    expect(secondRun[0].title).toBe("Taj Mahal Dinner");
    expect(secondRun[0].amount).toBe(4500);
  });

  it("stores only ciphertext in cache for portfolios and decrypts on retrieval", async () => {
    const key = portfolioCacheKey(mockSession);
    expect(key).toContain("portfolio:v2:");

    const firstRun = await getPortfolio(mockSession);
    expect(firstRun).not.toBeNull();
    expect(firstRun?.assets[0].name).toBe("Nifty 50 Index Fund");
    expect(firstRun?.assets[0].amount).toBe(50000);

    const cachedPayload = cacheStorage.get(key) as { assets: Record<string, unknown>[] };
    expect(cachedPayload).toBeDefined();

    expect(cachedPayload.assets[0].name).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(cachedPayload.assets[0].amount).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

    const serializedCache = JSON.stringify(cachedPayload);
    expect(serializedCache).not.toContain("Nifty 50 Index Fund");

    const secondRun = await getPortfolio(mockSession);
    expect(secondRun).not.toBeNull();
    expect(secondRun?.assets[0].name).toBe("Nifty 50 Index Fund");
    expect(secondRun?.assets[0].amount).toBe(50000);
  });
});
