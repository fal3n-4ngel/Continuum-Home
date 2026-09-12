import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as createExpenseRoute, GET as listExpensesRoute } from "@/app/api/(core)/expenses/route";
import { PATCH as updateExpenseRoute, DELETE as deleteExpenseRoute } from "@/app/api/(core)/expenses/[id]/route";
import { checkAuthFailures, recordAuthFailure } from "@/lib/auth/auth";
import { ApiError } from "@/lib/utils";

const mockCreatedDocs: Array<{ path: string; data: Record<string, unknown> }> = [];

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireUser: vi.fn(async (req: NextRequest) => {
      const authHeader = req.headers.get("authorization") || "";
      const isUserB = authHeader.includes("token-user-b");
      const uid = isUserB ? "user-B-456" : "user-A-123";
      return {
        creds: { apiKey: "test-key" },
        config: { apiKey: "test-key", projectId: "test-project", authDomain: "test.firebaseapp.com" },
        uid,
        idToken: `token-${uid}`,
        user: { uid, email: `${uid}@example.com`, displayName: uid },
      };
    }),
  };
});

vi.mock("@/lib/domain-events", () => ({
  recordDomainEvent: vi.fn(),
  DOMAIN_EVENTS: {
    EXPENSE_CREATED: "EXPENSE_CREATED",
    EXPENSE_UPDATED: "EXPENSE_UPDATED",
    EXPENSE_DELETED: "EXPENSE_DELETED",
  },
}));

vi.mock("@/lib/firebase/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/firebase/client")>();
  return {
    ...actual,
    listSubcollectionDocs: vi.fn(async (session: any) => {
      return [
        {
          id: "expense-1",
          data: {
            userId: session.uid,
            title: "EncryptedTitle",
            amount: "100",
            createdAt: Date.now(),
          },
        },
      ];
    }),
    runOwnedQuery: vi.fn(async () => []),
    fsFetch: vi.fn(async (_session: any, path: string, options?: any) => {
      const method = options?.method || "GET";

      if (method === "POST" && path.includes("/expenses")) {
        const body = JSON.parse(options?.body || "{}");
        mockCreatedDocs.push({ path, data: body });
        return { name: `${path}/generated-doc-id-999` };
      }

      if ((method === "PATCH" || method === "DELETE") && path.includes("/expenses/")) {
        if (!path.includes("existing-doc-owned-by-caller")) {
          throw new ApiError(404, "Document not found in user subcollection");
        }
        return { name: path };
      }

      return { documents: [] };
    }),
  };
});

describe("Security Invariant: Tenant Isolation and Identity Enforcement", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-tenant-isolation-tests";
    mockCreatedDocs.length = 0;
    vi.clearAllMocks();
  });

  it("prevents cross-user GET: queries /api/expenses strictly scoped to authenticated user and never leaks foreign records", async () => {
    const req = new NextRequest("http://localhost:3000/api/expenses", {
      method: "GET",
      headers: { Authorization: "Bearer token-user-a" },
    });

    const res = await listExpensesRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    for (const item of json) {
      expect(item.userId).not.toBe("user-B-456");
    }
  });

  it("ignores foreign userId in POST body and creates document strictly under authenticated user path", async () => {
    const maliciousPayload = {
      userId: "user-B-456",
      uid: "user-B-456",
      title: "Attacker Spoofed Expense",
      amount: 250,
      category: "Food",
    };

    const req = new NextRequest("http://localhost:3000/api/expenses", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-user-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(maliciousPayload),
    });

    const res = await createExpenseRoute(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockCreatedDocs.length).toBe(1);

    const createdDoc = mockCreatedDocs[0];
    expect(createdDoc.path).toContain("users/user-A-123/expenses");
    expect(createdDoc.path).not.toContain("user-B-456");

    const fields = (createdDoc.data as any).fields;
    expect(fields.userId.stringValue).toBe("user-A-123");
  });

  it("returns 404 when User A attempts to PATCH an expense ID owned by User B", async () => {
    const patchPayload = { title: "Hijacked Title" };

    const req = new NextRequest("http://localhost:3000/api/expenses/foreign-expense-id-b", {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-user-a",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload),
    });

    const res = await updateExpenseRoute(req, {
      params: Promise.resolve({ id: "foreign-expense-id-b" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 404 when User A attempts to DELETE an expense ID owned by User B", async () => {
    const req = new NextRequest("http://localhost:3000/api/expenses/foreign-expense-id-b", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer token-user-a",
      },
    });

    const res = await deleteExpenseRoute(req, {
      params: Promise.resolve({ id: "foreign-expense-id-b" }),
    });

    expect(res.status).toBe(404);
  });

  it("enforces failure limit and triggers 429 Too Many Requests after repeated failures", async () => {
    const testIp = "192.0.2.42";

    for (let i = 0; i < 20; i++) {
      await recordAuthFailure(testIp);
    }

    await expect(checkAuthFailures(testIp)).rejects.toThrowError(
      "Too many failed authentication attempts. Try again later."
    );
  });
});
