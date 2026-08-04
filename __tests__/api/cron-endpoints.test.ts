import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as portfolioPOST } from "@/app/api/cron/portfolio/route";
import { POST as subscriptionsPOST } from "@/app/api/cron/subscriptions/route";
import { POST as expensesPOST } from "@/app/api/cron/expenses/route";
import { NextRequest } from "next/server";

describe("Cron Endpoints Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CRON_SECRET = "secret-token-xyz";
    process.env.RESEND_API_KEY = "re_test_12345";
  });

  describe("POST /api/cron/portfolio", () => {
    it("returns 401 when Authorization header is missing or invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/portfolio", {
        method: "POST",
      });

      const res = await portfolioPOST(req);
      expect(res.status).toBe(401);
    });

    it("executes successfully when valid CRON_SECRET is provided", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: "email_123" }), { status: 200 })
      );

      const req = new NextRequest("http://localhost:3000/api/cron/portfolio", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token-xyz" },
      });

      const res = await portfolioPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.usersProcessed).toBe(2);
    });
  });

  describe("POST /api/cron/subscriptions", () => {
    it("returns 401 when Authorization header is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/cron/subscriptions", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      });

      const res = await subscriptionsPOST(req);
      expect(res.status).toBe(401);
    });

    it("runs subscription alert processing when authorized", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: "email_sub_123" }), { status: 200 })
      );

      const req = new NextRequest("http://localhost:3000/api/cron/subscriptions", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token-xyz" },
      });

      const res = await subscriptionsPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("POST /api/cron/expenses", () => {
    it("handles weekly vs monthly period parameters correctly", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: "email_exp_123" }), { status: 200 })
      );

      const reqWeekly = new NextRequest("http://localhost:3000/api/cron/expenses?period=weekly", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token-xyz" },
      });

      const resWeekly = await expensesPOST(reqWeekly);
      const dataWeekly = await resWeekly.json();

      expect(resWeekly.status).toBe(200);
      expect(dataWeekly.period).toBe("weekly");

      const reqMonthly = new NextRequest("http://localhost:3000/api/cron/expenses?period=monthly", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token-xyz" },
      });

      const resMonthly = await expensesPOST(reqMonthly);
      const dataMonthly = await resMonthly.json();

      expect(resMonthly.status).toBe(200);
      expect(dataMonthly.period).toBe("monthly");
    });
  });
});
