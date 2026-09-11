import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/(ops)/admin/cleanup-legacy/route";
import { NextRequest } from "next/server";
import * as firebaseAdmin from "@/lib/firebase/firebase-admin";

describe("API /api/admin/cleanup-legacy integration tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
  });

  it("successfully cleans up legacy collections and returns deleted count", async () => {
    const pruneSpy = vi.spyOn(firebaseAdmin, "adminCleanupLegacyCollections").mockResolvedValueOnce({
      deletedCount: 5,
      collections: ["notes", "health_analytics"],
    });

    const req = new NextRequest("http://localhost:3000/api/admin/cleanup-legacy", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(5);
    expect(data.collections).toEqual(["notes", "health_analytics"]);
    expect(pruneSpy).toHaveBeenCalledTimes(1);
  });

  it("handles errors gracefully and returns 500 status", async () => {
    vi.spyOn(firebaseAdmin, "adminCleanupLegacyCollections").mockRejectedValueOnce(
      new Error("Firestore connection failure")
    );

    const req = new NextRequest("http://localhost:3000/api/admin/cleanup-legacy", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("Firestore connection failure");
  });
});
