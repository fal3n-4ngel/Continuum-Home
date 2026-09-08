// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  recordDomainEvent,
  flushPendingDomainEvents,
  getPendingDomainEventsCount,
  resetDomainEventStateForTesting,
} from "@/lib/domain-events/client";
import { DOMAIN_EVENTS } from "@/lib/domain-events/types";
import * as errorNotifier from "@/lib/utils/error-notifier";

vi.mock("next/server", () => ({
  after: (fn: () => Promise<void>) => fn(),
}));

vi.mock("@/lib/utils/error-notifier", () => ({
  notifyError: vi.fn(),
}));

describe("Domain Events Client Resilience & Retry Queue", () => {
  const originalFetch = globalThis.fetch;
  const originalEnvKey = process.env.MONOLITH_API_KEY;

  beforeEach(() => {
    resetDomainEventStateForTesting();
    process.env.MONOLITH_API_KEY = "test-api-key";
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnvKey !== undefined) {
      process.env.MONOLITH_API_KEY = originalEnvKey;
    } else {
      delete process.env.MONOLITH_API_KEY;
    }
  });

  it("queues events and triggers Discord error alert when postback returns 503", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_UPDATED,
      userId: "user-123",
      entityId: "exp-1",
      payload: { amount: 50 },
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(getPendingDomainEventsCount()).toBe(1);
    expect(errorNotifier.notifyError).toHaveBeenCalledTimes(1);
    expect(errorNotifier.notifyError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: "Monolith Domain Event Postback",
        status: 503,
        isCritical: true,
      })
    );
  });

  it("throttles Discord error alert so duplicate events within 15 minutes do not spam alerts", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
      userId: "user-123",
      entityId: "exp-10",
    });
    await new Promise((r) => setTimeout(r, 20));

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_UPDATED,
      userId: "user-123",
      entityId: "exp-11",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(getPendingDomainEventsCount()).toBe(2);
    expect(errorNotifier.notifyError).toHaveBeenCalledTimes(1);
  });

  it("flushes pending events successfully when postback service recovers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_UPDATED,
      userId: "user-123",
      entityId: "exp-20",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(getPendingDomainEventsCount()).toBe(1);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    } as Response);

    const result = await flushPendingDomainEvents();
    expect(result.flushed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getPendingDomainEventsCount()).toBe(0);
  });
});
