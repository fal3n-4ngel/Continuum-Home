import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST, DELETE } from "@/app/api/(ops)/admin/pro-users/route";
import { POST as POST_REQUESTS } from "@/app/api/(ops)/admin/pro-requests/route";
import { NextRequest } from "next/server";
import * as firebaseAdmin from "@/lib/firebase/firebase-admin";

describe("API /api/admin/pro-users integration tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.ADMIN_EMAIL = "adiad.dev@gmail.com";
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "adiad.dev@gmail.com";
  });

  it("GET returns pro users list", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.proUsers).toBeDefined();
    expect(Array.isArray(data.proUsers)).toBe(true);
    expect(data.proUsers.length).toBeGreaterThan(0);
    expect(data.proUsers[0].email).toBe("user@example.com");
  });

  it("POST returns 400 when body has missing email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toMatch(/email is required/i);
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: "not-json",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toMatch(/invalid json/i);
  });

  it("POST successfully grants Pro status to existing user by email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ email: "member@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("member@example.com");
    expect(data.isNewUser).toBe(false);
    expect(data.uid).toBe("mock-uid-123");
  });

  it("POST successfully pre-grants Pro status to unregistered email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ email: "unregistered@example.com" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("unregistered@example.com");
    expect(data.isNewUser).toBe(true);
    expect(data.uid).toBeNull();
  });

  it("DELETE returns 400 when body has missing email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({}),
    });

    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toMatch(/email is required/i);
  });

  it("DELETE successfully revokes Pro access for an email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-users", {
      method: "DELETE",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ email: "member@example.com" }),
    });

    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("member@example.com");
    expect(data.message).toMatch(/revoked/i);
  });

  it("pro-requests endpoint also supports action: grant_by_email", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/pro-requests", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ action: "grant_by_email", email: "friend@example.com" }),
    });

    const res = await POST_REQUESTS(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("friend@example.com");
  });
});
