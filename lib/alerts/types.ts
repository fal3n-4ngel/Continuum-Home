export type AlertChannel = "alerts" | "events";

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

export const ALERT_COLORS = {
  RED: 16711680,      // #FF0000 - Critical failure, error, outage
  ORANGE: 16753920,   // #FFA500 - Warning, partial failure
  GREEN: 5763719,     // #57F287 - Success, new user, approved
  BLUE: 3447003,      // #3498DB - Info, cron, manual trigger
  GOLD: 16776960,     // #FFFF00 - Pro request, action required
  PURPLE: 10181046,   // #9B59B6 - Announcement broadcast
  GRAY: 9807270,      // #95A5A6 - Neutral notice
} as const;

export const DISCORD_RED = ALERT_COLORS.RED;
export const DISCORD_ORANGE = ALERT_COLORS.ORANGE;
export const DISCORD_GREEN = ALERT_COLORS.GREEN;

export interface ErrorNoticeOptions {
  context: string;
  error: unknown;
  status?: number;
  extraFields?: Record<string, string>;
  isCritical?: boolean;
}
