import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveWebhookUrl,
  postDiscordEmbed,
  sendDiscordEmbed,
  notifyError,
  notifyNewUserRegistration,
  notifyUserDeletion,
  notifyProClaimSubmitted,
  notifyProClaimDecision,
  notifyAdminAnnouncement,
  notifyAdminCacheFlush,
  notifyAdminCronTrigger,
  ALERT_COLORS,
} from "@/lib/alerts";

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

function lastCall(fetchSpy: ReturnType<typeof vi.spyOn>) {
  const call = fetchSpy.mock.calls.at(-1);
  if (!call) return null;
  const url = call[0] as string;
  const body = JSON.parse((call[1] as RequestInit).body as string);
  return { url, body };
}

describe("Alerts Subsystem — Multi-Channel Webhook Routing", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pending.length = 0;
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 204 }));
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_ALERTS_WEBHOOK_URL;
    delete process.env.DISCORD_EVENTS_WEBHOOK_URL;
    delete process.env.DISCORD_ADMIN_WEBHOOK_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_ALERTS_WEBHOOK_URL;
    delete process.env.DISCORD_EVENTS_WEBHOOK_URL;
    delete process.env.DISCORD_ADMIN_WEBHOOK_URL;
  });

  describe("resolveWebhookUrl", () => {
    it("resolves specific alerts webhook when configured", () => {
      process.env.DISCORD_ALERTS_WEBHOOK_URL = "https://discord.com/api/webhooks/alerts";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("alerts")).toBe("https://discord.com/api/webhooks/alerts");
    });

    it("falls back to legacy DISCORD_WEBHOOK_URL for alerts", () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("alerts")).toBe("https://discord.com/api/webhooks/legacy");
    });

    it("resolves specific admin webhook when configured", () => {
      process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/admin";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("admin")).toBe("https://discord.com/api/webhooks/admin");
    });

    it("resolves events webhook alias when DISCORD_EVENTS_WEBHOOK_URL is configured", () => {
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("events")).toBe("https://discord.com/api/webhooks/events");
      expect(resolveWebhookUrl("admin")).toBe("https://discord.com/api/webhooks/events");
    });

    it("does NOT fall back to legacy DISCORD_WEBHOOK_URL for admin or events (strictly isolated from alerts)", () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("admin")).toBeNull();
      expect(resolveWebhookUrl("events")).toBeNull();
    });

    it("returns null when no webhook is set for either channel", () => {
      expect(resolveWebhookUrl("alerts")).toBeNull();
      expect(resolveWebhookUrl("admin")).toBeNull();
      expect(resolveWebhookUrl("events")).toBeNull();
    });
  });

  describe("postDiscordEmbed routing and defensive payload safety", () => {
    beforeEach(() => {
      process.env.DISCORD_ALERTS_WEBHOOK_URL = "https://discord.com/api/webhooks/alerts";
      process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/admin";
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";
    });

    it("routes to alerts webhook with default Continuum Alerts username", async () => {
      await postDiscordEmbed({ title: "Alert Test", color: ALERT_COLORS.RED }, "alerts");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/alerts");
      expect(call.body.username).toBe("Continuum Alerts");
      expect(call.body.embeds[0].title).toBe("Alert Test");
    });

    it("routes to admin webhook with default Continuum Admin username", async () => {
      await postDiscordEmbed({ title: "Admin Action", color: ALERT_COLORS.GREEN }, "admin");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.username).toBe("Continuum Admin");
      expect(call.body.embeds[0].title).toBe("Admin Action");
    });

    it("clamps oversized fields and values to Discord limits", async () => {
      const longTitle = "A".repeat(500);
      const longDesc = "B".repeat(5000);
      const longField = "C".repeat(2000);

      await postDiscordEmbed(
        {
          title: longTitle,
          description: longDesc,
          color: ALERT_COLORS.BLUE,
          fields: [{ name: "LongField", value: longField }],
        },
        "alerts"
      );

      const embed = lastCall(fetchSpy)!.body.embeds[0];
      expect(embed.title.length).toBeLessThanOrEqual(256);
      expect(embed.description.length).toBeLessThanOrEqual(4096);
      expect(embed.fields[0].value.length).toBeLessThanOrEqual(1024);
    });

    it("swallows fetch failures gracefully without throwing", async () => {
      fetchSpy.mockRejectedValue(new Error("Discord API timeout"));
      await expect(
        postDiscordEmbed({ title: "Will Fail", color: ALERT_COLORS.RED }, "alerts")
      ).resolves.not.toThrow();
    });
  });

  describe("System Alerts: notifyError", () => {
    beforeEach(() => {
      process.env.DISCORD_ALERTS_WEBHOOK_URL = "https://discord.com/api/webhooks/alerts";
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";
    });

    it("sends 500 errors to alerts channel with RED color", async () => {
      notifyError({
        context: "PATCH /api/expenses/[id]",
        error: new Error("Permission denied by database security rules."),
        status: 403,
        isCritical: true,
      });

      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/alerts");
      expect(call.body.username).toBe("Continuum Alerts");
      expect(call.body.embeds[0].title).toContain("System Alert: PATCH /api/expenses/[id]");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.RED);
    });

    it("skips 401 and 404 from dispatching alerts", async () => {
      notifyError({ context: "GET /api/secret", error: new Error("Unauthorized"), status: 401 });
      notifyError({ context: "GET /api/missing", error: new Error("Not Found"), status: 404 });
      await flush();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Events & Admin Lifecycle: Event Notifiers", () => {
    beforeEach(() => {
      process.env.DISCORD_ALERTS_WEBHOOK_URL = "https://discord.com/api/webhooks/alerts";
      process.env.DISCORD_ADMIN_WEBHOOK_URL = "https://discord.com/api/webhooks/admin";
    });

    it("routes notifyNewUserRegistration to admin webhook", async () => {
      notifyNewUserRegistration({ uid: "user-123", email: "newuser@example.com", displayName: "New User" });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.username).toBe("Continuum Admin");
      expect(call.body.embeds[0].title).toContain("New User Registration");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GREEN);
    });

    it("routes notifyUserDeletion to admin webhook", async () => {
      notifyUserDeletion({ uid: "user-456", email: "deleted@example.com" });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.embeds[0].title).toContain("User Account Deleted");
    });

    it("routes notifyProClaimSubmitted to admin webhook", async () => {
      notifyProClaimSubmitted({
        uid: "pro-user",
        email: "pro@example.com",
        platform: "github",
        handle: "octocat",
        note: "Sponsoring $10/mo",
      });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.embeds[0].title).toContain("New Pro Request");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GOLD);
    });

    it("routes notifyProClaimDecision to admin webhook with appropriate colors", async () => {
      notifyProClaimDecision({ uid: "pro-user", email: "pro@example.com", action: "approve" });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.embeds[0].title).toContain("Approved");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GREEN);
    });

    it("routes notifyAdminAnnouncement to admin webhook", async () => {
      notifyAdminAnnouncement({ subject: "Release 2.5 is live!", total: 10, successCount: 10, failedCount: 0 });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/admin");
      expect(call.body.embeds[0].title).toContain("Announcement Broadcast");
    });

    it("routes notifyAdminCacheFlush and notifyAdminCronTrigger to admin webhook", async () => {
      notifyAdminCacheFlush("admin@example.com");
      await flush();
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/admin");

      notifyAdminCronTrigger({ task: "subscriptions", adminEmail: "admin@example.com" });
      await flush();
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/admin");
    });

    it("auto-routes sendDiscordEmbed with Admin Audit footer to admin webhook", async () => {
      await sendDiscordEmbed("Admin Audit Log", "Admin took an action", 12345, "Continuum Dashboard • Admin Audit");
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/admin");
      expect(lastCall(fetchSpy)!.body.username).toBe("Continuum Admin");
    });

    it("falls back to DISCORD_EVENTS_WEBHOOK_URL when DISCORD_ADMIN_WEBHOOK_URL is unset", async () => {
      delete process.env.DISCORD_ADMIN_WEBHOOK_URL;
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";

      notifyAdminCacheFlush("admin@example.com");
      await flush();
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/events");
    });
  });
});
