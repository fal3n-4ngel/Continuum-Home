import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  buildRecurringIdempotencyKey,
  advanceRecurringDate,
  collectDueBillingDates,
  buildRecurringExpenseEntry,
} from "@/lib/finance/recurring";
import { listSubcollectionDocs } from "@/lib/firebase/client";
import { POST as postOAuthRegister } from "@/app/api/(auth)/oauth/register/route";
import { GET as getAuthServer } from "@/app/.well-known/oauth-authorization-server/route";
import type { Session } from "@/lib/auth";
import type { SubscriptionRecord } from "@/lib/firebase";

const mockSession: Session = {
  uid: "user-1",
  idToken: "tok",
  creds: {} as Session["creds"],
  user: { uid: "user-1", email: "u@example.com", displayName: "User" },
  config: { projectId: "proj-1", apiKey: "k", authDomain: "d" },
};

describe("Recurring Subscriptions & Idempotency", () => {
  it("builds deterministic idempotency keys", () => {
    expect(buildRecurringIdempotencyKey("sub123", "2026-11-25")).toBe("sub_sub123_2026-11-25");
  });

  it("advances monthly and yearly dates with month-end clamping", () => {
    expect(advanceRecurringDate("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advanceRecurringDate("2024-02-29", "yearly")).toBe("2025-02-28");
    expect(advanceRecurringDate("2026-11-15", "monthly")).toBe("2026-12-15");
  });

  it("collects all due billing dates up to today", () => {
    const res = collectDueBillingDates("2026-09-01", "monthly", "2026-11-25");
    expect(res.dueDates).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(res.nextDate).toBe("2026-12-01");
  });

  it("builds recurring expense and income entries with idempotency keys", () => {
    const sub: SubscriptionRecord = {
      id: "sal1",
      name: "Monthly Salary",
      cost: 120000,
      billingCycle: "monthly",
      nextBillingDate: "2026-11-01",
      icon: "💼",
      type: "income",
      autoPost: true,
      category: "Salary",
      createdAt: 1000,
    };
    const entry = buildRecurringExpenseEntry(sub, "2026-11-01");
    expect(entry.type).toBe("income");
    expect(entry.category).toBe("Salary");
    expect(entry.idempotencyKey).toBe("sub_sal1_2026-11-01");
  });
});

describe("listSubcollectionDocs Pagination", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("follows nextPageToken beyond 300 documents", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            documents: [{ name: "projects/p/databases/(default)/documents/users/u/expenses/e1", fields: {} }],
            nextPageToken: "page-2-token",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            documents: [{ name: "projects/p/databases/(default)/documents/users/u/expenses/e2", fields: {} }],
          }),
          { status: 200 }
        )
      );

    const docs = await listSubcollectionDocs(mockSession, "expenses");
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.id)).toEqual(["e1", "e2"]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("pageToken=page-2-token");
  });
});

describe("OAuth Dynamic Client Registration (RFC 7591)", () => {
  it("advertises registration_endpoint in oauth-authorization-server metadata", async () => {
    const req = new Request("https://uat-continuum-home.vercel.app/.well-known/oauth-authorization-server", {
      headers: { "x-forwarded-host": "uat-continuum-home.vercel.app", "x-forwarded-proto": "https" },
    });
    const res = await getAuthServer(req);
    const json = await res.json();
    expect(json.registration_endpoint).toBe("https://uat-continuum-home.vercel.app/api/oauth/register");
  });

  it("registers a ChatGPT MCP client dynamically", async () => {
    const req = new NextRequest("https://uat-continuum-home.vercel.app/api/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        client_name: "ChatGPT",
        redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
      }),
    });
    const res = await postOAuthRegister(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.client_id).toMatch(/^dcr_/);
    expect(json.token_endpoint_auth_method).toBe("none");
  });

  it("rejects untrusted redirect_uris during DCR", async () => {
    const req = new NextRequest("https://uat-continuum-home.vercel.app/api/oauth/register", {
      method: "POST",
      body: JSON.stringify({
        redirect_uris: ["https://evil.example.com/callback"],
      }),
    });
    const res = await postOAuthRegister(req);
    expect(res.status).toBe(400);
  });
});
