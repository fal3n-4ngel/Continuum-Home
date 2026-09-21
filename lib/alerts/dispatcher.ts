import { AlertChannel, DiscordEmbed } from "./types";
import { waitUntil } from "@vercel/functions";

const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;
const MAX_FIELDS = 25;
const MAX_FOOTER = 2048;

export function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function codeBlock(text: string, max: number = MAX_FIELD_VALUE): string {
  const fence = "```";
  const budget = max - fence.length * 2 - 2;
  return `${fence}\n${clamp(text, budget)}\n${fence}`;
}

export function resolveWebhookUrl(channel: AlertChannel): string | null {
  if (channel === "admin" || channel === "events") {
    return (
      process.env.DISCORD_ADMIN_WEBHOOK_URL ||
      process.env.DISCORD_EVENTS_WEBHOOK_URL ||
      null
    );
  }
  return (
    process.env.DISCORD_ALERTS_WEBHOOK_URL ||
    process.env.DISCORD_WEBHOOK_URL ||
    null
  );
}

export interface PostEmbedOptions {
  username?: string;
  avatarUrl?: string;
}

export async function postDiscordEmbed(
  embed: DiscordEmbed,
  channel: AlertChannel = "alerts",
  options?: PostEmbedOptions
): Promise<void> {
  const webhookUrl = resolveWebhookUrl(channel);
  if (!webhookUrl) return;

  const safeEmbed: DiscordEmbed = {
    title: clamp(embed.title, MAX_TITLE),
    color: embed.color,
    timestamp: embed.timestamp || new Date().toISOString(),
  };
  if (embed.description) safeEmbed.description = clamp(embed.description, MAX_DESCRIPTION);
  if (embed.footer) safeEmbed.footer = { text: clamp(embed.footer.text, MAX_FOOTER) };
  if (embed.fields?.length) {
    safeEmbed.fields = embed.fields.slice(0, MAX_FIELDS).map((f) => ({
      name: clamp(f.name, MAX_FIELD_NAME),
      value: clamp(f.value, MAX_FIELD_VALUE),
      inline: f.inline,
    }));
  }

  const defaultUsername =
    channel === "admin" || channel === "events" ? "Continuum Admin" : "Continuum Alerts";
  const body: Record<string, unknown> = {
    username: options?.username || defaultUsername,
    embeds: [safeEmbed],
  };
  if (options?.avatarUrl) {
    body.avatar_url = options.avatarUrl;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Discord webhook (${channel}) rejected alert (${res.status}): ${await res.text()}`);
    }
  } catch (e) {
    console.error(`Failed to send Discord alert to channel '${channel}':`, e);
  }
}

export function dispatchBackground(fn: () => Promise<void>): void {
  try {
    waitUntil(fn());
  } catch {
    fn().catch(() => {});
  }
}

export async function sendDiscordEmbed(
  title: string,
  message: string,
  color: number,
  footer: string,
  channel?: AlertChannel
): Promise<void> {
  const targetChannel: AlertChannel =
    channel ||
    (/admin|audit|user/i.test(title) || /admin|audit/i.test(footer) ? "admin" : "alerts");

  return postDiscordEmbed(
    { title, description: message, color, footer: { text: footer } },
    targetChannel
  );
}
