import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireUser, verifyIdToken } from "@/lib/auth/auth";
import { isAllowedOAuthRedirect } from "@/lib/auth/oauth-clients";
import { GET as oauthAuthorizeGet, POST as oauthAuthorizePost } from "@/app/api/(auth)/oauth/authorize/route";

describe("Security Invariant: Auth & OAuth Security Controls", () => {
  beforeEach(() => {
    process.env.FIREBASE_CONFIG = JSON.stringify({
      apiKey: "test-api-key",
      projectId: "test-project",
      authDomain: "test.firebaseapp.com",
    });
    process.env.OAUTH_ALLOWED_CLIENTS = JSON.stringify([
      { clientId: "chatgpt", redirectUriPrefix: "https://chatgpt.com/aip/" },
      { clientId: "trusted-app", redirectUri: "https://trusted-app.example/callback" },
    ]);
  });

  describe("Token Verification Invariants", () => {
    it("rejects malformed token: missing authorization header", async () => {
      const req = new NextRequest("http://localhost:3000/api/expenses", {
        headers: {},
      });
      await expect(requireUser(req)).rejects.toThrowError("Missing or invalid Authorization header");
    });

    it("rejects malformed token: missing bearer scheme", async () => {
      const req = new NextRequest("http://localhost:3000/api/expenses", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      await expect(requireUser(req)).rejects.toThrowError("Missing or invalid Authorization header");
    });

    it("rejects malformed token: empty bearer value", async () => {
      const req = new NextRequest("http://localhost:3000/api/expenses", {
        headers: { Authorization: "Bearer " },
      });
      await expect(requireUser(req)).rejects.toThrowError("Missing bearer token");
    });

    it("rejects expired token when Google token lookup returns 400/401", async () => {
      vi.spyOn(global, "fetch").mockImplementationOnce(async () => {
        return new Response(JSON.stringify({ error: { message: "TOKEN_EXPIRED" } }), { status: 400 });
      });

      const config = { apiKey: "test-api-key", projectId: "test-project", authDomain: "test.firebaseapp.com" };
      await expect(verifyIdToken(config, "expired-test-id-token")).rejects.toThrowError(
        "Invalid or expired authentication token."
      );
    });
  });

  describe("OAuth Authorization Redirect & State Validation", () => {
    it("rejects invalid redirect URI not matching registered clients", () => {
      expect(isAllowedOAuthRedirect("chatgpt", "https://evil.com/callback")).toBe(false);
      expect(isAllowedOAuthRedirect("chatgpt", "https://chatgpt.com.attacker.com/aip/")).toBe(false);
      expect(isAllowedOAuthRedirect("unknown-client", "https://trusted-app.example/callback")).toBe(false);
      expect(isAllowedOAuthRedirect("trusted-app", "https://trusted-app.example/wrong-path")).toBe(false);
    });

    it("permits registered OAuth redirect URIs", () => {
      expect(isAllowedOAuthRedirect("chatgpt", "https://chatgpt.com/aip/g-12345/oauth/callback")).toBe(true);
      expect(isAllowedOAuthRedirect("trusted-app", "https://trusted-app.example/callback")).toBe(true);
    });

    it("returns 400 when GET /api/oauth/authorize is missing state", async () => {
      const req = new NextRequest("http://localhost:3000/api/oauth/authorize?client_id=trusted-app&redirect_uri=https://trusted-app.example/callback");
      const res = await oauthAuthorizeGet(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Missing required OAuth 2.0 query parameters");
    });

    it("returns 400 when GET /api/oauth/authorize has invalid redirect URI", async () => {
      const req = new NextRequest("http://localhost:3000/api/oauth/authorize?client_id=trusted-app&redirect_uri=https://evil.attacker.com/callback&state=state123");
      const res = await oauthAuthorizeGet(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Unrecognized client_id/redirect_uri");
    });

    it("returns 400 when POST /api/oauth/authorize is missing state", async () => {
      const req = new NextRequest("http://localhost:3000/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "trusted-app",
          redirectUri: "https://trusted-app.example/callback",
          idToken: "test-token",
          refreshToken: "test-refresh",
        }),
      });
      const res = await oauthAuthorizePost(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when POST /api/oauth/authorize has invalid redirect URI", async () => {
      const req = new NextRequest("http://localhost:3000/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: "trusted-app",
          redirectUri: "https://evil.attacker.com/callback",
          state: "state123",
          idToken: "test-token",
          refreshToken: "test-refresh",
        }),
      });
      const res = await oauthAuthorizePost(req);
      expect(res.status).toBe(400);
    });
  });
});
