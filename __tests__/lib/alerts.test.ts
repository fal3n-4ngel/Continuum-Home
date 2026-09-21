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

    it("resolves specific events webhook when configured", () => {
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("events")).toBe("https://discord.com/api/webhooks/events");
    });

    it("falls back to legacy DISCORD_WEBHOOK_URL for events when no event webhook is set", () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/legacy";
      expect(resolveWebhookUrl("events")).toBe("https://discord.com/api/webhooks/legacy");
    });

    it("returns null when no webhook is set for either channel", () => {
      expect(resolveWebhookUrl("alerts")).toBeNull();
      expect(resolveWebhookUrl("events")).toBeNull();
    });
  });

  describe("postDiscordEmbed routing and defensive payload safety", () => {
    beforeEach(() => {
      process.env.DISCORD_ALERTS_WEBHOOK_URL = "https://discord.com/api/webhooks/alerts";
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

    it("routes to events webhook with default Continuum Events username", async () => {
      await postDiscordEmbed({ title: "Event Test", color: ALERT_COLORS.GREEN }, "events");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.username).toBe("Continuum Events");
      expect(call.body.embeds[0].title).toBe("Event Test");
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
      process.env.DISCORD_EVENTS_WEBHOOK_URL = "https://discord.com/api/webhooks/events";
    });

    it("routes notifyNewUserRegistration to events webhook", async () => {
      notifyNewUserRegistration({ uid: "user-123", email: "newuser@example.com", displayName: "New User" });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.username).toBe("Continuum Events");
      expect(call.body.embeds[0].title).toContain("New User Registration");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GREEN);
    });

    it("routes notifyUserDeletion to events webhook", async () => {
      notifyUserDeletion({ uid: "user-456", email: "deleted@example.com" });
      await flush();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.embeds[0].title).toContain("User Account Deleted");
    });

    it("routes notifyProClaimSubmitted to events webhook", async () => {
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
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.embeds[0].title).toContain("New Pro Request");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GOLD);
    });

    it("routes notifyProClaimDecision to events webhook with appropriate colors", async () => {
      notifyProClaimDecision({ uid: "pro-user", email: "pro@example.com", action: "approve" });
      await flush();

      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.embeds[0].title).toContain("Approved");
      expect(call.body.embeds[0].color).toBe(ALERT_COLORS.GREEN);
    });

    it("routes notifyAdminAnnouncement to events webhook", async () => {
      notifyAdminAnnouncement({ subject: "Release 2.5 is live!", total: 10, successCount: 10, failedCount: 0 });
      await flush();

      const call = lastCall(fetchSpy)!;
      expect(call.url).toBe("https://discord.com/api/webhooks/events");
      expect(call.body.embeds[0].title).toContain("Announcement Broadcast");
    });

    it("routes notifyAdminCacheFlush and notifyAdminCronTrigger to events webhook", async () => {
      notifyAdminCacheFlush("admin@example.com");
      await flush();
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/events");

      notifyAdminCronTrigger({ task: "subscriptions", adminEmail: "admin@example.com" });
      await flush();
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/events");
    });

    it("auto-routes sendDiscordEmbed with Admin Audit footer to events webhook", async () => {
      await sendDiscordEmbed("Admin Audit Log", "Admin took an action", 12345, "Continuum Dashboard • Admin Audit");
      expect(lastCall(fetchSpy)!.url).toBe("https://discord.com/api/webhooks/events");
    });
  });
});
