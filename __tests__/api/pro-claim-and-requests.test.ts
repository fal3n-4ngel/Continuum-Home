import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProClaim, POST as postProClaim } from "@/app/api/(system)/pro-claim/route";
import { GET as getAdminProRequests, POST as postAdminProRequests } from "@/app/api/(ops)/admin/pro-requests/route";
import { GET as getAdminProUsers, POST as postAdminProUsers } from "@/app/api/(ops)/admin/pro-users/route";
import * as firebaseAdmin from "@/lib/firebase/firebase-admin";
import * as alerts from "@/lib/alerts";

describe("Pro Claim & Pro Requests API (Schema v2 Path-Isolation)", () => {
  let mockCollections: {
    store: Record<string, Record<string, any>>;
    getDocData: (colPath: string, docId: string) => any;
    setDocData: (colPath: string, docId: string, data: any, merge?: boolean) => void;
  };
  let mockDb: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
    process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: "personal-hub-adi" });

    const store: Record<string, Record<string, any>> = {};

    function getDocData(colPath: string, docId: string) {
      return store[colPath]?.[docId] ?? null;
    }

    function setDocData(colPath: string, docId: string, data: any, merge = false) {
      if (!store[colPath]) store[colPath] = {};
      if (merge && store[colPath][docId]) {
        store[colPath][docId] = { ...store[colPath][docId], ...data };
      } else {
        store[colPath][docId] = { ...data };
      }
    }

    mockCollections = {
      store,
      getDocData,
      setDocData,
    };

    mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === "users") {
          return {
            doc: (userId: string) => ({
              collection: (subCol: string) => ({
                doc: (docId: string) => ({
                  get: vi.fn(async () => {
                    const fullCol = `users/${userId}/${subCol}`;
                    const data = getDocData(fullCol, docId);
                    return {
                      exists: data !== null,
                      data: () => data,
                    };
                  }),
                  set: vi.fn(async (data: any, options?: { merge?: boolean }) => {
                    const fullCol = `users/${userId}/${subCol}`;
                    setDocData(fullCol, docId, data, options?.merge);
                  }),
                  update: vi.fn(async (data: any) => {
                    const fullCol = `users/${userId}/${subCol}`;
                    setDocData(fullCol, docId, data, true);
                  }),
                }),
              }),
            }),
          };
        }

        return {
          doc: (docId: string) => ({
            get: vi.fn(async () => {
              const data = getDocData(colName, docId);
              return {
                exists: data !== null,
                data: () => data,
              };
            }),
            set: vi.fn(async (data: any, options?: { merge?: boolean }) => {
              setDocData(colName, docId, data, options?.merge);
            }),
            update: vi.fn(async (data: any) => {
              setDocData(colName, docId, data, true);
            }),
          }),
          where: vi.fn((field: string, _op: string, val: any) => ({
            get: vi.fn(async () => {
              const colData = store[colName] || {};
              const matches = Object.entries(colData)
                .filter(([_, d]) => d[field] === val)
                .map(([id, d]) => ({
                  id,
                  data: () => d,
                }));
              return {
                docs: matches,
                empty: matches.length === 0,
              };
            }),
            limit: vi.fn(() => ({
              get: vi.fn(async () => {
                const colData = store[colName] || {};
                const matches = Object.entries(colData)
                  .filter(([_, d]) => d[field] === val)
                  .map(([id, d]) => ({
                    id,
                    data: () => d,
                  }));
                return {
                  docs: matches,
                  empty: matches.length === 0,
                };
              }),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                get: vi.fn(async () => {
                  const colData = store[colName] || {};
                  const matches = Object.entries(colData)
                    .filter(([_, d]) => d[field] === val)
                    .map(([id, d]) => ({
                      id,
                      data: () => d,
                    }));
                  return {
                    docs: matches,
                    empty: matches.length === 0,
                  };
                }),
              })),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(async () => {
                const colData = store[colName] || {};
                const docs = Object.entries(colData).map(([id, d]) => ({
                  id,
                  data: () => d,
                }));
                return { docs, empty: docs.length === 0 };
              }),
            })),
          })),
          add: vi.fn(async (data: any) => {
            const id = `claim_${Date.now()}`;
            setDocData(colName, id, data);
            return { id };
          }),
        };
      }),
    };

    const mockAuth = {
      listUsers: vi.fn(async () => ({
        users: [
          { uid: "pro_user_1", email: "pro1@example.com", displayName: "Pro One", metadata: { creationTime: "2026-01-01" } },
          { uid: "free_user_2", email: "free2@example.com", displayName: "Free Two", metadata: { creationTime: "2026-02-01" } },
        ],
        pageToken: undefined,
      })),
      getUserByEmail: vi.fn(async (email: string) => {
        if (email === "free2@example.com") return { uid: "free_user_2", email: "free2@example.com" };
        if (email === "pro1@example.com") return { uid: "pro_user_1", email: "pro1@example.com" };
        throw new Error("User not found");
      }),
      getUser: vi.fn(async (uid: string) => {
        if (uid === "free_user_2") return { uid: "free_user_2", email: "free2@example.com" };
        if (uid === "pro_user_1") return { uid: "pro_user_1", email: "pro1@example.com" };
        throw new Error("User not found");
      }),
    };

    vi.spyOn(firebaseAdmin, "getAdminDb").mockReturnValue(mockDb as any);
    vi.spyOn(firebaseAdmin, "getAdminAuth").mockReturnValue(mockAuth as any);
  });

  describe("POST /api/pro-claim", () => {
    it("rejects if user already has isPro in schema v2 preferences", async () => {
      mockCollections.setDocData("users/admin123/settings", "preferences", {
        isPro: true,
        salaryDay: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ platform: "github", handle: "user123" }),
      });

      const res = await postProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toContain("already a Pro account");
    });

    it("rejects if user already has isPro in legacy settings collection", async () => {
      mockCollections.setDocData("settings", "admin123", {
        isPro: true,
      });

      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ platform: "github", handle: "user123" }),
      });

      const res = await postProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toContain("already a Pro account");
    });

    it("rejects if user already has a pending pro claim", async () => {
      mockCollections.setDocData("pro_claims", "claim_1", {
        uid: "admin123",
        status: "pending",
        platform: "github",
        handle: "user123",
      });

      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ platform: "github", handle: "user123" }),
      });

      const res = await postProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(409);
      expect(data.error).toContain("already have a pending Pro request");
    });

    it("creates pro claim and notifies Discord events channel", async () => {
      const notifySpy = vi.spyOn(alerts, "notifyProClaimSubmitted");

      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ platform: "github", handle: "cooldev", note: "Star on repo" }),
      });

      const res = await postProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const claims = Object.values(mockCollections.store["pro_claims"] || {});
      expect(claims.length).toBe(1);
      expect((claims[0] as any).handle).toBe("cooldev");
      expect((claims[0] as any).status).toBe("pending");
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "admin123",
          platform: "github",
          handle: "cooldev",
        })
      );
    });
  });

  describe("GET /api/pro-claim", () => {
    it("returns null if no claim exists", async () => {
      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });

      const res = await getProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.claim).toBeNull();
    });

    it("returns existing claim if found", async () => {
      mockCollections.setDocData("pro_claims", "claim_99", {
        uid: "admin123",
        platform: "github",
        handle: "cooldev",
        status: "pending",
        submittedAt: 12345678,
      });

      const req = new NextRequest("http://localhost:3000/api/pro-claim", {
        method: "GET",
        headers: { Authorization: "Bearer token" },
      });

      const res = await getProClaim(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.claim).toEqual({
        id: "claim_99",
        platform: "github",
        handle: "cooldev",
        status: "pending",
        submittedAt: 12345678,
      });
    });
  });

  describe("POST /api/admin/pro-requests", () => {
    it("approves a pending claim and writes isPro: true to users/{uid}/settings/preferences", async () => {
      const targetUid = "test_user_789";
      mockCollections.setDocData("pro_claims", "claim_target", {
        uid: targetUid,
        email: "target@example.com",
        platform: "github",
        handle: "targetdev",
        status: "pending",
      });

      // Existing user settings at schema v2 path
      mockCollections.setDocData(`users/${targetUid}/settings`, "preferences", {
        timeFilter: "30",
        salaryDay: 5,
        monthlySalary: 50000,
        isPro: false,
      });

      const notifySpy = vi.spyOn(alerts, "notifyProClaimDecision");

      const req = new NextRequest("http://localhost:3000/api/admin/pro-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ claimId: "claim_target", action: "approve" }),
      });

      const res = await postAdminProRequests(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify claim updated
      const claim = mockCollections.getDocData("pro_claims", "claim_target");
      expect(claim.status).toBe("approved");

      // Verify schema v2 preferences has isPro: true and preserved other fields
      const updatedPrefs = mockCollections.getDocData(`users/${targetUid}/settings`, "preferences");
      expect(updatedPrefs.isPro).toBe(true);
      expect(updatedPrefs.timeFilter).toBe("30");
      expect(updatedPrefs.monthlySalary).toBe(50000);

      // Verify notification sent
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: targetUid,
          email: "target@example.com",
          action: "approve",
          adminEmail: "adiad.dev@gmail.com",
        })
      );
    });

    it("creates new preferences doc with isPro: true if none existed before", async () => {
      const newUid = "brand_new_user";
      mockCollections.setDocData("pro_claims", "claim_new", {
        uid: newUid,
        email: "new@example.com",
        platform: "github",
        handle: "newbie",
        status: "pending",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/pro-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ claimId: "claim_new", action: "approve" }),
      });

      const res = await postAdminProRequests(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const createdPrefs = mockCollections.getDocData(`users/${newUid}/settings`, "preferences");
      expect(createdPrefs).toBeDefined();
      expect(createdPrefs.isPro).toBe(true);
      expect(createdPrefs.salaryDay).toBe(1);
    });

    it("denies a pending claim without modifying user settings", async () => {
      const targetUid = "test_user_deny";
      mockCollections.setDocData("pro_claims", "claim_deny", {
        uid: targetUid,
        email: "deny@example.com",
        platform: "github",
        handle: "spammer",
        status: "pending",
      });

      const notifySpy = vi.spyOn(alerts, "notifyProClaimDecision");

      const req = new NextRequest("http://localhost:3000/api/admin/pro-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ claimId: "claim_deny", action: "deny" }),
      });

      const res = await postAdminProRequests(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const claim = mockCollections.getDocData("pro_claims", "claim_deny");
      expect(claim.status).toBe("denied");

      const prefs = mockCollections.getDocData(`users/${targetUid}/settings`, "preferences");
      expect(prefs).toBeNull();

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: targetUid,
          action: "deny",
        })
      );
    });
  });

  describe("GET /api/admin/pro-users", () => {
    it("returns only users who have isPro: true in settings", async () => {
      mockCollections.setDocData("users/pro_user_1/settings", "preferences", {
        isPro: true,
        updatedAt: 1700000000,
      });

      mockCollections.setDocData("users/free_user_2/settings", "preferences", {
        isPro: false,
      });

      mockCollections.setDocData("pro_claims", "claim_pro_1", {
        uid: "pro_user_1",
        platform: "github",
        handle: "pro_coder",
        status: "approved",
        submittedAt: 1699999999,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "GET",
        headers: { Authorization: "Bearer admin-token" },
      });

      const res = await getAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalCount).toBe(1);
      expect(data.proUsers).toHaveLength(1);
      expect(data.proUsers[0]).toEqual(
        expect.objectContaining({
          uid: "pro_user_1",
          email: "pro1@example.com",
          displayName: "Pro One",
          isPro: true,
          claimSource: expect.objectContaining({
            platform: "github",
            handle: "pro_coder",
          }),
        })
      );
    });

    it("falls back to legacy settings/{uid} if v2 preferences document is missing", async () => {
      mockCollections.setDocData("settings", "pro_user_1", {
        isPro: true,
        updatedAt: 1710000000,
      });

      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "GET",
        headers: { Authorization: "Bearer admin-token" },
      });

      const res = await getAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.proUsers).toHaveLength(1);
      expect(data.proUsers[0].uid).toBe("pro_user_1");
      expect(data.proUsers[0].isPro).toBe(true);
    });
  });

  describe("POST /api/admin/pro-users", () => {
    it("grants Pro access by email and sends audit notification to admin channel", async () => {
      const notifySpy = vi.spyOn(alerts, "postDiscordEmbed").mockResolvedValue(undefined);

      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({ action: "grant", emailOrUid: "free2@example.com" }),
      });

      const res = await postAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isPro).toBe(true);
      expect(data.uid).toBe("free_user_2");

      const prefs = mockCollections.getDocData("users/free_user_2/settings", "preferences");
      expect(prefs).toBeDefined();
      expect(prefs.isPro).toBe(true);

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Pro Access Granted"),
          fields: expect.arrayContaining([
            expect.objectContaining({ name: "Target User", value: "free2@example.com" }),
          ]),
        }),
        "admin"
      );
    });

    it("revokes Pro access by UID and sends audit notification to admin channel", async () => {
      mockCollections.setDocData("users/pro_user_1/settings", "preferences", {
        isPro: true,
      });

      const notifySpy = vi.spyOn(alerts, "postDiscordEmbed").mockResolvedValue(undefined);

      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({ action: "revoke", uid: "pro_user_1" }),
      });

      const res = await postAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isPro).toBe(false);

      const prefs = mockCollections.getDocData("users/pro_user_1/settings", "preferences");
      expect(prefs.isPro).toBe(false);

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Pro Access Revoked"),
        }),
        "admin"
      );
    });

    it("rejects unknown action", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({ action: "invalid_action", uid: "pro_user_1" }),
      });

      const res = await postAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toContain("action must be 'grant' or 'revoke'");
    });

    it("returns 404 when granting Pro to non-existent user", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
        body: JSON.stringify({ action: "grant", emailOrUid: "nonexistent@example.com" }),
      });

      const res = await postAdminProUsers(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.message).toContain("User not found in Firebase Auth");
    });
  });
});

