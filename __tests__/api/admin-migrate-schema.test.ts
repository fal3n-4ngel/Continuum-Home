import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/(ops)/admin/migrate-schema/route";
import { NextRequest } from "next/server";
import * as firebaseAdmin from "@/lib/firebase/firebase-admin";

describe("API /api/admin/migrate-schema integration tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
  });

  it("executes dry-run migration successfully", async () => {
    const migrateSpy = vi.spyOn(firebaseAdmin, "adminMigrateFirestoreArchitecture").mockResolvedValueOnce({
      dryRun: true,
      usersProcessed: 2,
      expensesMigrated: 10,
      subscriptionsMigrated: 4,
      portfoliosMigrated: 2,
      settingsMigrated: 2,
      watchlistsMigrated: 2,
      details: ["User 1 ok", "User 2 ok"],
    });

    const req = new NextRequest("http://localhost:3000/api/admin/migrate-schema", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.summary.dryRun).toBe(true);
    expect(data.summary.expensesMigrated).toBe(10);
    expect(migrateSpy).toHaveBeenCalledWith(true);
  });

  it("executes prune legacy records when requested", async () => {
    const pruneSpy = vi.spyOn(firebaseAdmin, "adminPruneMigratedLegacyRecords").mockResolvedValueOnce({
      prunedCount: 15,
      collections: ["expenses", "subscriptions", "portfolios"],
    });

    const req = new NextRequest("http://localhost:3000/api/admin/migrate-schema", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ dryRun: false, prune: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pruneResult.prunedCount).toBe(15);
    expect(pruneSpy).toHaveBeenCalledTimes(1);
  });

  it("handles errors gracefully and returns 500 status", async () => {
    vi.spyOn(firebaseAdmin, "adminMigrateFirestoreArchitecture").mockRejectedValueOnce(
      new Error("Migration pipeline aborted")
    );

    const req = new NextRequest("http://localhost:3000/api/admin/migrate-schema", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("Migration pipeline aborted");
  });
});
