import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { reportCronFailures, reportCronAbort, type CronUserResult } from "@/lib/cron";

// waitUntil normally hands the promise to the platform to finish after the
// response is sent; here we collect them so assertions can await delivery.
const { pending } = vi.hoisted(() => ({ pending: [] as Promise<unknown>[] }));
vi.mock("@vercel/functions", () => ({
  waitUntil: (p: Promise<unknown>) => {
    pending.push(p);
    return p;
  },
}));

async function flush() {
  await Promise.all(pending);
}

function lastPayload(fetchSpy: ReturnType<typeof vi.spyOn>) {
  const call = fetchSpy.mock.calls.at(-1);
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

describe("cron alerting", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pending.length = 0;
    process.env.DISCORD_WEBHOOK_URL = "https://discord.test/webhook";
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 204 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it("stays silent when every user succeeded", async () => {
    const results: CronUserResult[] = [
      { uid: "a", email: "a@x.com", sent: true },
      { uid: "b", email: "b@x.com", sent: false, reason: "deduplicated" },
    ];

    reportCronFailures("portfolio", results);
    await flush();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("alerts with the error log when some users fail", async () => {
    const results: CronUserResult[] = [
      { uid: "a", email: "a@x.com", sent: true },
      { uid: "b", email: "b@x.com", sent: false, error: "Resend API failed: 429" },
    ];

    reportCronFailures("portfolio", results);
    await flush();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const embed = lastPayload(fetchSpy).embeds[0];
    expect(embed.title).toContain("portfolio");
    const fields = Object.fromEntries(embed.fields.map((f: any) => [f.name, f.value]));
    expect(fields.Failed).toBe("1 / 2");
    expect(fields.Errors).toContain("b@x.com: Resend API failed: 429");
    // Partial failure, not a total outage.
    expect(embed.footer.text).toContain("Partial");
  });

  it("distinguishes a total failure from a partial one", async () => {
    const results: CronUserResult[] = [
      { uid: "a", email: "a@x.com", sent: false, error: "boom" },
      { uid: "b", email: "b@x.com", sent: false, error: "boom" },
    ];

    reportCronFailures("subscriptions", results);
    await flush();

    const embed = lastPayload(fetchSpy).embeds[0];
    expect(embed.footer.text).toContain("All users failed");
  });

  it("reports a cron that could not start at all", async () => {
    reportCronAbort("recommendations", "Missing GEMINI_API_KEY");
    await flush();

    const embed = lastPayload(fetchSpy).embeds[0];
    expect(embed.title).toContain("Cron Aborted");
    const fields = Object.fromEntries(embed.fields.map((f: any) => [f.name, f.value]));
    expect(fields.Reason).toBe("Missing GEMINI_API_KEY");
  });

  it("keeps oversized error logs inside Discord's field limit", async () => {
    // 200 failures with long messages would blow the 1024-char field cap and
    // get the whole alert rejected with a 400 if it weren't truncated.
    const results: CronUserResult[] = Array.from({ length: 200 }, (_, i) => ({
      uid: `u${i}`,
      email: `user${i}@example.com`,
      sent: false,
      error: `Firestore deadline exceeded after retrying ${i} times`,
    }));

    reportCronFailures("expenses", results);
    await flush();

    const embed = lastPayload(fetchSpy).embeds[0];
    for (const field of embed.fields) {
      expect(field.value.length).toBeLessThanOrEqual(1024);
    }
    // Truncation must not strip the closing fence of the code block.
    const errors = embed.fields.find((f: any) => f.name === "Errors").value;
    expect(errors.startsWith("```")).toBe(true);
    expect(errors.endsWith("```")).toBe(true);
  });

  it("does not attempt delivery when no webhook is configured", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;

    reportCronFailures("portfolio", [{ uid: "a", email: "a@x.com", sent: false, error: "boom" }]);
    await flush();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("swallows a rejected webhook so alerting can never break the cron", async () => {
    fetchSpy.mockRejectedValue(new Error("network down"));

    reportCronFailures("portfolio", [{ uid: "a", email: "a@x.com", sent: false, error: "boom" }]);

    await expect(flush()).resolves.not.toThrow();
  });
});
