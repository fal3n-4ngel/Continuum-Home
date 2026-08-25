// One-click unsubscribe links for cron-sent emails. Links carry the uid in
// the clear plus an HMAC token so anyone with the link can toggle that
// user's own email prefs, but can't forge a link for a different uid.
//
// Signed with CRON_SECRET rather than a new env var — it's already a
// required, server-only secret in every deployment that runs the email
// crons, so there's nothing extra to provision. Since it's per-deployment
// (Production and UAT each have their own CRON_SECRET), a token signed on
// one deployment is never valid on another.
import crypto from "crypto";
import { env } from "./env";

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

export function signUnsubscribeToken(uid: string): string {
  // Falls back to a fixed string only so local dev without CRON_SECRET set
  // doesn't crash — every real deployment has CRON_SECRET configured (the
  // cron routes themselves refuse to run without it).
  const signingSecret = env.CRON_SECRET || "local-dev-unsubscribe-secret";
  return crypto.createHmac("sha256", signingSecret).update(uid).digest("hex");
}

export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  if (!uid || !token) return false;
  const expected = signUnsubscribeToken(uid);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(uid: string, category: UnsubscribeCategory): string {
  const token = signUnsubscribeToken(uid);
  const params = new URLSearchParams({ uid, category, token });
  return `${env.APP_URL}/api/unsubscribe?${params.toString()}`;
}
