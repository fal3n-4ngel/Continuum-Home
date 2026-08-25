// One-click unsubscribe links for cron-sent emails. Links carry the uid in
// the clear plus an HMAC token so anyone with the link can toggle that
// user's own email prefs, but can't forge a link for a different uid.
//
// Signed with CRON_SECRET rather than a new env var — it's already a
// required, server-only secret in every deployment that runs the email
// crons, so there's nothing extra to provision.
import crypto from "crypto";

export const EMAIL_CATEGORIES = ["expenses", "portfolio", "subscriptions"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

// "all" is a landing-page convenience (unsubscribe from every category in
// one click) — it's never the category a specific cron email links to.
export type UnsubscribeCategory = EmailCategory | "all";

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  expenses: "Expense Summaries",
  portfolio: "Portfolio Updates",
  subscriptions: "Subscription Renewal Alerts",
};

function getSigningSecret(): string {
  // Falls back to a fixed string only so local dev without CRON_SECRET set
  // doesn't crash — production always has CRON_SECRET configured (the
  // cron routes themselves refuse to run without it).
  return process.env.CRON_SECRET || "local-dev-unsubscribe-secret";
}

export function signUnsubscribeToken(uid: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(uid).digest("hex");
}

export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  if (!uid || !token) return false;
  const expected = signUnsubscribeToken(uid);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

export function buildUnsubscribeUrl(uid: string, category: UnsubscribeCategory): string {
  const token = signUnsubscribeToken(uid);
  const params = new URLSearchParams({ uid, category, token });
  return `${getAppUrl()}/api/unsubscribe?${params.toString()}`;
}
