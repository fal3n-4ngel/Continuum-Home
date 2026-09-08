import crypto from "crypto";
import { env } from "@/lib/utils";

export const EMAIL_CATEGORIES = ["expenses", "portfolio", "subscriptions"] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export type UnsubscribeCategory = EmailCategory | "all";

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  expenses: "Expense Summaries",
  portfolio: "Portfolio Updates",
  subscriptions: "Subscription Renewal Alerts",
};

const SIGNING_SECRET = env.CRON_SECRET || "local-dev-unsubscribe-secret";

export function signUnsubscribeToken(uid: string): string {
  return crypto.createHmac("sha256", SIGNING_SECRET).update(uid).digest("hex");
}

export function verifyUnsubscribeToken(uid: string, token: string): boolean {
  if (!uid || !token) return false;
  const a = Buffer.from(signUnsubscribeToken(uid), "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildUnsubscribeUrl(uid: string, category: UnsubscribeCategory): string {
  const params = new URLSearchParams({ uid, category, token: signUnsubscribeToken(uid) });
  return `${env.APP_URL}/api/unsubscribe?${params.toString()}`;
}
