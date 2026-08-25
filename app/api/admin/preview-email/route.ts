import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { buildPortfolioEmail } from "@/emails/templates/portfolio";
import { buildExpensesEmail } from "@/emails/templates/expenses";
import { buildSubscriptionsEmail } from "@/emails/templates/subscriptions";
import { samplePortfolio, sampleExpenses, sampleSubscriptions } from "@/emails/samples";

export const dynamic = "force-dynamic";

const PREVIEW_TYPES = ["portfolio", "expenses_weekly", "expenses_monthly", "subscriptions"] as const;
type PreviewType = (typeof PREVIEW_TYPES)[number];

function isPreviewType(value: string): value is PreviewType {
  return (PREVIEW_TYPES as readonly string[]).includes(value);
}

// Previews render a real unsubscribe link so the admin sees the exact footer
// users get. It points at the admin's own preferences, not a stranger's.
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
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    if (session.user.email !== env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const type: string = body.type || "portfolio";
    if (!isPreviewType(type)) {
      return NextResponse.json({ error: `Unknown preview type: ${type}` }, { status: 400 });
    }

    const { buildUnsubscribeUrl } = await import("@/lib/unsubscribe");
    const category = type.startsWith("expenses") ? "expenses" : (type as "portfolio" | "subscriptions");
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
  } catch (err) {
    console.error("Preview email error:", err);
    const message = err instanceof Error ? err.message : "Failed to send preview email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
