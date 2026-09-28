import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRecordDomainEvent = vi.fn();
const mockCreateExpense = vi.fn().mockResolvedValue({ id: "exp-123" });
const mockArchiveExpense = vi.fn().mockResolvedValue({ success: true });
const mockGetExpense = vi.fn().mockResolvedValue({
  id: "exp-123",
  title: "Coffee",
  amount: 150,
  category: "Food",
  date: "2026-09-28",
});
const mockAddWatchlistItem = vi.fn().mockResolvedValue({ id: "wl-123" });
const mockUpdateWatchlistItem = vi.fn().mockResolvedValue({ success: true });
const mockDeleteWatchlistItem = vi.fn().mockResolvedValue({ success: true });
const mockCreateSubscription = vi.fn().mockResolvedValue({ id: "sub-123" });

vi.mock("@/lib/domain-events", () => ({
  recordDomainEvent: (...args: any[]) => mockRecordDomainEvent(...args),
  DOMAIN_EVENTS: {
    EXPENSE_CREATED: "EXPENSE_CREATED",
    EXPENSE_UPDATED: "EXPENSE_UPDATED",
    EXPENSE_DELETED: "EXPENSE_DELETED",
    WATCHLIST_ADDED: "WATCHLIST_ADDED",
    WATCHLIST_UPDATED: "WATCHLIST_UPDATED",
    WATCHLIST_REMOVED: "WATCHLIST_REMOVED",
    SUBSCRIPTION_CREATED: "SUBSCRIPTION_CREATED",
  },
}));

vi.mock("@/lib/firebase", () => ({
  createExpense: (...args: any[]) => mockCreateExpense(...args),
  archiveExpense: (...args: any[]) => mockArchiveExpense(...args),
  getExpense: (...args: any[]) => mockGetExpense(...args),
  listExpenses: vi.fn().mockResolvedValue([]),
  listWatchlist: vi.fn().mockResolvedValue([]),
  addWatchlistItem: (...args: any[]) => mockAddWatchlistItem(...args),
  updateWatchlistItem: (...args: any[]) => mockUpdateWatchlistItem(...args),
  deleteWatchlistItem: (...args: any[]) => mockDeleteWatchlistItem(...args),
  listSubscriptions: vi.fn().mockResolvedValue([]),
  createSubscription: (...args: any[]) => mockCreateSubscription(...args),
  getPortfolio: vi.fn().mockResolvedValue({}),
  getSettings: vi.fn().mockResolvedValue({}),
}));

import { POST as postMcp } from "@/app/api/mcp/route";

describe("MCP Audit Trails & Domain Events (chatgpt_plugin source)", () => {
  const origin = "https://uat-continuum-home.vercel.app";
  const testToken = "test-token-mcp-audit";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_TEST_TOKEN = testToken;
  });

  it("records EXPENSE_CREATED domain event with channel and source chatgpt_plugin", async () => {
    const req = new NextRequest(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${testToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-exp-1",
        method: "tools/call",
        params: {
          name: "create_expense",
          arguments: {
            title: "Lunch",
            amount: 250,
            category: "Food",
            date: "2026-09-28",
            notes: "Via ChatGPT plugin",
          },
        },
      }),
    });

    const res = await postMcp(req);
    expect(res.status).toBe(200);

    expect(mockCreateExpense).toHaveBeenCalled();
    expect(mockRecordDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "EXPENSE_CREATED",
        userId: expect.any(String),
        entityId: "exp-123",
        payload: expect.objectContaining({
          title: "Lunch",
          amount: 250,
          category: "Food",
          date: "2026-09-28",
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        }),
      })
    );
  });

  it("records EXPENSE_DELETED domain event with channel and source chatgpt_plugin", async () => {
    const req = new NextRequest(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${testToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-exp-del",
        method: "tools/call",
        params: {
          name: "delete_expense",
          arguments: { id: "exp-123" },
        },
      }),
    });

    const res = await postMcp(req);
    expect(res.status).toBe(200);

    expect(mockArchiveExpense).toHaveBeenCalled();
    expect(mockRecordDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "EXPENSE_DELETED",
        userId: expect.any(String),
        entityId: "exp-123",
        payload: expect.objectContaining({
          title: "Coffee",
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        }),
      })
    );
  });

  it("records WATCHLIST_ADDED domain event with channel and source chatgpt_plugin", async () => {
    const req = new NextRequest(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${testToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-wl-1",
        method: "tools/call",
        params: {
          name: "add_watchlist_item",
          arguments: {
            title: "Interstellar",
            type: "movie",
            status: "Completed",
            rating: 10,
          },
        },
      }),
    });

    const res = await postMcp(req);
    expect(res.status).toBe(200);

    expect(mockAddWatchlistItem).toHaveBeenCalled();
    expect(mockRecordDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "WATCHLIST_ADDED",
        userId: expect.any(String),
        entityId: "wl-123",
        payload: expect.objectContaining({
          title: "Interstellar",
          type: "movie",
          status: "completed",
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        }),
      })
    );
  });

  it("records SUBSCRIPTION_CREATED domain event with channel and source chatgpt_plugin", async () => {
    const req = new NextRequest(`${origin}/api/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${testToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-sub-1",
        method: "tools/call",
        params: {
          name: "create_subscription",
          arguments: {
            name: "Netflix",
            amount: 649,
            billingCycle: "monthly",
          },
        },
      }),
    });

    const res = await postMcp(req);
    expect(res.status).toBe(200);

    expect(mockCreateSubscription).toHaveBeenCalled();
    expect(mockRecordDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUBSCRIPTION_CREATED",
        userId: expect.any(String),
        entityId: "sub-123",
        payload: expect.objectContaining({
          name: "Netflix",
          cost: 649,
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        }),
      })
    );
  });
});
