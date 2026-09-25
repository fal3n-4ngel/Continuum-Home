import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProtectedResource } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as getAuthServer } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as getOpenIdConfig } from "@/app/.well-known/openid-configuration/route";
import { GET as getMcp, POST as postMcp, OPTIONS as optionsMcp } from "@/app/api/mcp/route";
import { isAllowedOAuthRedirect } from "@/lib/auth/oauth-clients";

describe("OAuth Discovery & MCP Server Endpoints", () => {
  const origin = "https://uat-continuum-home.vercel.app";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RFC 9728 & RFC 8414 Discovery Endpoints", () => {
    it("returns valid oauth-protected-resource metadata with CORS headers", async () => {
      const req = new Request(`${origin}/.well-known/oauth-protected-resource`, {
        headers: { "x-forwarded-host": "uat-continuum-home.vercel.app", "x-forwarded-proto": "https" },
      });
      const res = await getProtectedResource(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");

      const json = await res.json();
      expect(json.resource).toBe(`${origin}/api/mcp`);
      expect(json.authorization_servers).toContain(origin);
      expect(json.scopes_supported).toEqual(["read", "write"]);
    });

    it("returns valid oauth-authorization-server metadata with authorization & token endpoints", async () => {
      const req = new Request(`${origin}/.well-known/oauth-authorization-server`, {
        headers: { "x-forwarded-host": "uat-continuum-home.vercel.app", "x-forwarded-proto": "https" },
      });
      const res = await getAuthServer(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");

      const json = await res.json();
      expect(json.issuer).toBe(origin);
      expect(json.authorization_endpoint).toBe(`${origin}/api/oauth/authorize`);
      expect(json.token_endpoint).toBe(`${origin}/api/oauth/token`);
      expect(json.response_types_supported).toContain("code");
      expect(json.grant_types_supported).toContain("authorization_code");
    });

    it("returns valid openid-configuration metadata", async () => {
      const req = new Request(`${origin}/.well-known/openid-configuration`, {
        headers: { "x-forwarded-host": "uat-continuum-home.vercel.app", "x-forwarded-proto": "https" },
      });
      const res = await getOpenIdConfig(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.issuer).toBe(origin);
      expect(json.authorization_endpoint).toBe(`${origin}/api/oauth/authorize`);
      expect(json.token_endpoint).toBe(`${origin}/api/oauth/token`);
    });
  });

  describe("ChatGPT Redirect URI Compatibility", () => {
    it("allows standard ChatGPT MCP connector redirect URI", () => {
      const allowed = isAllowedOAuthRedirect(
        "any-client-id",
        "https://chatgpt.com/connector_platform_oauth_redirect"
      );
      expect(allowed).toBe(true);
    });

    it("allows OpenAI AIP redirect URIs", () => {
      expect(isAllowedOAuthRedirect("any-client", "https://chatgpt.com/aip/g-12345/oauth/callback")).toBe(true);
      expect(isAllowedOAuthRedirect("any-client", "https://chat.openai.com/aip/g-12345/oauth/callback")).toBe(true);
    });
  });

  describe("MCP Server (/api/mcp)", () => {
    it("returns CORS headers on OPTIONS", async () => {
      const res = await optionsMcp();
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("access-control-allow-methods")).toContain("GET");
      expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    });

    it("allows unauthenticated discovery for initialize and tools/list so ChatGPT indexes tools", async () => {
      const initReq = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: "init-1", method: "initialize" }),
      });
      const initRes = await postMcp(initReq);
      expect(initRes.status).toBe(200);

      const listReq = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: "list-1", method: "tools/list" }),
      });
      const listRes = await postMcp(listReq);
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.result.tools.length).toBeGreaterThan(0);
    });

    it("returns 401 with standard WWW-Authenticate challenge when unauthenticated tools/call", async () => {
      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "call-1",
          method: "tools/call",
          params: { name: "list_expenses", arguments: {} },
        }),
      });
      const res = await postMcp(req);
      expect(res.status).toBe(401);
      const wwwAuth = res.headers.get("www-authenticate");
      expect(wwwAuth).toContain("Bearer");
      expect(wwwAuth).toContain(`resource_metadata="${origin}/.well-known/oauth-protected-resource"`);
    });

    it("handles initialize method when authenticated with CRON_TEST_TOKEN", async () => {
      const testToken = "test-token-mcp-123";
      process.env.CRON_TEST_TOKEN = testToken;

      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${testToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "init-1",
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            clientInfo: { name: "ChatGPT", version: "1.0.0" },
          },
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe("init-1");
      expect(json.result.serverInfo.name).toBe("Continuum Home");
      expect(json.result.capabilities.tools).toBeDefined();
    });

    it("lists all available tools with schema manifests", async () => {
      const testToken = "test-token-mcp-123";
      process.env.CRON_TEST_TOKEN = testToken;

      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${testToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        }),
      });

      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.tools).toBeInstanceOf(Array);
      const toolNames = json.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain("connect_account");
      expect(toolNames).toContain("get_auth_status");
      expect(toolNames).toContain("list_expenses");
      expect(toolNames).toContain("create_expense");
      expect(toolNames).toContain("list_watchlist");
      expect(toolNames).toContain("add_watchlist_item");
      expect(toolNames).toContain("list_subscriptions");
      expect(toolNames).toContain("get_portfolio");
      expect(toolNames).toContain("get_settings");
    });

    it("returns tools manifest on GET when Accept is not text/event-stream", async () => {
      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const res = await getMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.tools.length).toBeGreaterThan(0);
    });

    it("handles empty POST probe or invalid JSON without failing with 400", async () => {
      const emptyReq = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: "",
      });
      const emptyRes = await postMcp(emptyReq);
      expect(emptyRes.status).toBe(200);
      const emptyJson = await emptyRes.json();
      expect(emptyJson.result.tools.length).toBeGreaterThan(0);

      const invalidReq = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: "not-json-content",
      });
      const invalidRes = await postMcp(invalidReq);
      expect(invalidRes.status).toBe(200);
      const invalidJson = await invalidRes.json();
      expect(invalidJson.result.tools.length).toBeGreaterThan(0);
    });

    it("allows unauthenticated call to connect_account and returns OAuth URL", async () => {
      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "connect-1",
          method: "tools/call",
          params: { name: "connect_account", arguments: {} },
        }),
      });
      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.content[0].text).toContain("/api/oauth/authorize");
    });

    it("allows unauthenticated call to get_auth_status and indicates not connected", async () => {
      const req = new NextRequest(`${origin}/api/mcp`, {
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "auth-status-1",
          method: "tools/call",
          params: { name: "get_auth_status", arguments: {} },
        }),
      });
      const res = await postMcp(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const payload = JSON.parse(json.result.content[0].text);
      expect(payload.authenticated).toBe(false);
    });
  });
});
