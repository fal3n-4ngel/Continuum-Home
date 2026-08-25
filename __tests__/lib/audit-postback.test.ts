// @vitest-environment node
//
// Runs in the node environment on purpose: the client branches on `typeof window`,
// and the server path is the one where an Authorization header is allowed at all.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendAuditPostback } from "@/lib/audit-postback";

function lastRequest(fetchSpy: ReturnType<typeof vi.spyOn>) {
  const call = fetchSpy.mock.calls.at(-1);
  return {
    url: call?.[0] as string,
    init: call?.[1] as RequestInit,
    body: JSON.parse((call?.[1] as RequestInit).body as string),
  };
}

describe("audit postback client", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_POSTBACK_API_URL = "https://api.test";
    delete process.env.MONOLITH_API_KEY;
    fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ logId: "log-1" }), { status: 202 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_POSTBACK_API_URL;
  });

  it("posts to the versioned ingest path", async () => {
    await sendAuditPostback({ eventType: "USER_LOGIN", userId: "u1" });

    const { url, body } = lastRequest(fetchSpy);
    expect(url).toBe("https://api.test/api/v1/audit/postback");
    expect(body).toMatchObject({
      sourceApp: "continuum-home",
      eventType: "USER_LOGIN",
      userId: "u1",
      severity: "INFO",
    });
  });

  it("does not honour a base URL that already points at the endpoint twice", async () => {
    process.env.NEXT_PUBLIC_POSTBACK_API_URL = "https://api.test/audit/postback";

    await sendAuditPostback({ eventType: "USER_LOGIN" });

    expect(lastRequest(fetchSpy).url).toBe("https://api.test/audit/postback");
  });

  it("omits an Authorization header when no server-side key is configured", async () => {
    await sendAuditPostback({ eventType: "USER_LOGIN" });

    const headers = lastRequest(fetchSpy).init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("sends a server-only key when one is configured", async () => {
    process.env.MONOLITH_API_KEY = "server-secret";

    await sendAuditPostback({ eventType: "USER_LOGIN" });

    const headers = lastRequest(fetchSpy).init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer server-secret");
  });

  it("does not resend headers the receiver reads for itself", async () => {
    await sendAuditPostback({ eventType: "USER_LOGIN" });

    const { body } = lastRequest(fetchSpy);
    expect(body.context).not.toHaveProperty("userAgent");
    expect(body.context).not.toHaveProperty("clientHref");
  });

  it("drops an oversized payload instead of sending a doomed request", async () => {
    await sendAuditPostback({
      eventType: "USER_LOGIN",
      metadata: { blob: "x".repeat(20_000) },
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("backs off after a 429 and stops sending until the window passes", async () => {
    fetchSpy.mockResolvedValue(
      new Response("", { status: 429, headers: { "Retry-After": "60" } })
    );

    await sendAuditPostback({ eventType: "USER_LOGIN" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await sendAuditPostback({ eventType: "USER_LOGIN" });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // muted, not retried
  });

  it("never rejects when the network fails", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(sendAuditPostback({ eventType: "USER_LOGIN" })).resolves.toBeUndefined();
  });

  it("skips prodOnly events outside production", async () => {
    process.env.APP_ENV = "development";

    await sendAuditPostback({ eventType: "USER_LOGIN", prodOnly: true });

    expect(fetchSpy).not.toHaveBeenCalled();
    delete process.env.APP_ENV;
  });
});
