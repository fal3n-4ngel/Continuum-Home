import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import { env } from "@/lib/utils";
import { buildUnsubscribeUrl, buildGuestUnsubscribeUrl } from "@/lib/auth";
import { buildPortfolioEmail } from "@/emails/templates/portfolio";
import { buildExpensesEmail } from "@/emails/templates/expenses";
import { buildSubscriptionsEmail, buildFamilyMemberSubscriptionEmail } from "@/emails/templates/subscriptions";
import { samplePortfolio, sampleExpenses, sampleSubscriptions, sampleFamilySubscription } from "@/emails/samples";

export const dynamic = "force-dynamic";

const PREVIEW_TYPES = [
  "portfolio",
  "expenses_weekly",
  "expenses_monthly",
  "subscriptions",
  "subscriptions_family",
  "subscriptions_family_guest",
] as const;
type PreviewType = (typeof PREVIEW_TYPES)[number];

function isPreviewType(value: string): value is PreviewType {
  return (PREVIEW_TYPES as readonly string[]).includes(value);
}

function render(type: PreviewType, appUrl: string, unsubscribeUrl: string) {
  switch (type) {
    case "portfolio":
      return buildPortfolioEmail(samplePortfolio(appUrl, unsubscribeUrl));
    case "expenses_weekly":
      return buildExpensesEmail(sampleExpenses("weekly", appUrl, unsubscribeUrl));
    case "expenses_monthly":
      return buildExpensesEmail(sampleExpenses("monthly", appUrl, unsubscribeUrl));
    case "subscriptions":
      return buildSubscriptionsEmail(sampleSubscriptions(appUrl, unsubscribeUrl));
    case "subscriptions_family":
      return buildFamilyMemberSubscriptionEmail(sampleFamilySubscription(appUrl, true, unsubscribeUrl));
    case "subscriptions_family_guest":
      return buildFamilyMemberSubscriptionEmail(
        sampleFamilySubscription(appUrl, false, buildGuestUnsubscribeUrl("alex@example.com"))
      );
  }
}

export const GET = withAdmin("GET /api/admin/preview-email", async (req, session) => {
  const type = req.nextUrl.searchParams.get("type") || "portfolio";
  if (!isPreviewType(type)) {
    return NextResponse.json({ error: `Unknown preview type: ${type}` }, { status: 400 });
  }
  const { buildUnsubscribeUrl } = await import("@/lib/auth");
  const category = type.startsWith("expenses")
    ? "expenses"
    : type.startsWith("subscriptions")
    ? "subscriptions"
    : "portfolio";
  const { subject, html } = render(type, env.APP_URL, buildUnsubscribeUrl(session.user.uid, category));
  return NextResponse.json({ success: true, type, subject, html });
});

export const POST = withAdmin("POST /api/admin/preview-email", async (req, session) => {
  if (!env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const type: string = body.type || "portfolio";
  if (!isPreviewType(type)) {
    return NextResponse.json({ error: `Unknown preview type: ${type}` }, { status: 400 });
  }

  const { buildUnsubscribeUrl } = await import("@/lib/auth");
  const category = type.startsWith("expenses")
    ? "expenses"
    : type.startsWith("subscriptions")
    ? "subscriptions"
    : "portfolio";
  const { subject, html } = render(type, env.APP_URL, buildUnsubscribeUrl(session.user.uid, category));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CRON_SENDER_EMAIL,
      to: [env.ADMIN_EMAIL],
      subject: `[PREVIEW] ${subject}`,
      html,
    }),
  });

  if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);

  return NextResponse.json({ success: true, sentTo: env.ADMIN_EMAIL, type });
});
