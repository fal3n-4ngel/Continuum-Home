// Single Discord webhook sender for the whole app. Alert payloads are the
// last line of defence when something breaks unattended (crons, background
// jobs), so the failure modes here matter: a malformed embed is rejected by
// Discord with a 400 and the alert vanishes. Everything below is built to
// make that impossible — values are truncated to Discord's documented
// limits before sending, and a non-2xx response is logged rather than
// silently swallowed.

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

// https://discord.com/developers/docs/resources/message#embed-object-embed-limits
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FIELD_NAME = 256;
const MAX_FIELD_VALUE = 1024;
const MAX_FIELDS = 25;
const MAX_FOOTER = 2048;

export const DISCORD_RED = 16711680;
export const DISCORD_ORANGE = 16753920;
export const DISCORD_GREEN = 5763719;

function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

// Wraps text in a fenced code block that is guaranteed to still fit inside a
// field value once the fences are added — used for stack traces and error
// logs, where truncating after the fact would strip the closing fence and
// leave Discord rendering the rest of the embed as code.
export function codeBlock(text: string, max: number = MAX_FIELD_VALUE): string {
  const fence = "```";
  const budget = max - fence.length * 2 - 2; // 2 newlines
  return `${fence}\n${clamp(text, budget)}\n${fence}`;
}

export async function postDiscordEmbed(embed: DiscordEmbed): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
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

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Continuum Alerts", embeds: [safeEmbed] }),
    });
    if (!res.ok) {
      // Don't throw — an unsendable alert must never take down the request
      // that was trying to report a problem in the first place.
      console.error(`Discord webhook rejected alert (${res.status}): ${await res.text()}`);
    }
  } catch (e) {
    console.error("Failed to send Discord alert:", e);
  }
}

export async function sendDiscordEmbed(title: string, message: string, color: number, footer: string) {
  return postDiscordEmbed({ title, description: message, color, footer: { text: footer } });
}
