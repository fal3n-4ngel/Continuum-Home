import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/admin/cron/route";
import { NextRequest } from "next/server";

describe("API /api/admin/cron integration tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
    process.env.CRON_SECRET = "test-cron-secret-123";
  });

  it("returns 400 for invalid or missing trigger type", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ triggerType: "invalid_task" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid trigger type.");
  });

  it("accepts 'triggerType' parameter in request body", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ success: true, message: "Cron executed" }), { status: 200 })
    );

    const req = new NextRequest("http://localhost:3000/api/admin/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ triggerType: "portfolio" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cron/portfolio",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret-123" },
      })
    );
  });

  it("accepts fallback 'task' parameter in request body", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ success: true, message: "Cron executed" }), { status: 200 })
    );

    const req = new NextRequest("http://localhost:3000/api/admin/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ task: "subscriptions" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cron/subscriptions",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret-123" },
      })
    );
  });

  it("handles expenses weekly and monthly trigger types correctly", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const reqWeekly = new NextRequest("http://localhost:3000/api/admin/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ triggerType: "expenses_weekly" }),
    });

    const resWeekly = await POST(reqWeekly);
    expect(resWeekly.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cron/expenses?period=weekly",
      expect.anything()
    );

    const reqMonthly = new NextRequest("http://localhost:3000/api/admin/cron", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ triggerType: "expenses_monthly" }),
    });

    const resMonthly = await POST(reqMonthly);
    expect(resMonthly.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/cron/expenses?period=monthly",
      expect.anything()
    );
  });
});
