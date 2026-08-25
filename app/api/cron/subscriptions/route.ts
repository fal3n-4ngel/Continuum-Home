import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { listAllUsers, adminListSubscriptions, adminGetEmailSubscriptions, type AdminUser } from "@/lib/firebase-admin";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron-guard";
import { getIstDateString } from "@/lib/dates";
import { reportCronFailures, reportCronAbort, type CronUserResult } from "@/lib/cron-alert";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { buildSubscriptionsEmail } from "@/emails/templates/subscriptions";
import { env, resolveEmailRecipient } from "@/lib/env";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; emailed: number };

async function processUser(user: AdminUser, resendApiKey: string, force: boolean = false): Promise<ProcessResult> {
  const todayDateStr = getIstDateString();
  if (!force) {
    const alreadySent = await hasCronBeenSentToday("subscriptions", user.uid, todayDateStr);
    if (alreadySent) {
      return { sent: false, reason: "subscription email already sent today (deduplicated)" };
    }
  }
  const emailPrefs = await adminGetEmailSubscriptions(user.uid);
  if (!emailPrefs.subscriptions) {
    return { sent: false, reason: "user unsubscribed from subscription renewal emails" };
  }
  const subscriptions = await adminListSubscriptions(user.uid);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingRenewals = subscriptions.filter((sub) => {
    if (!sub.nextBillingDate) return false;
    const billingDate = new Date(sub.nextBillingDate + "T00:00:00");
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 2 || diffDays === 3;
  });

  if (upcomingRenewals.length === 0) {
    return { sent: false, reason: "no renewals in the 2-3 day window" };
  }

  const unsubscribeUrl = buildUnsubscribeUrl(user.uid, "subscriptions");
  const { subject, html } = buildSubscriptionsEmail({
    renewals: upcomingRenewals.map((sub) => ({
      name: sub.name,
      icon: sub.icon,
      cost: sub.cost,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate,
      daysUntil: Math.ceil(
        (new Date(sub.nextBillingDate + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ),
    })),
    appUrl: env.APP_URL,
    unsubscribeUrl,
  });

  const { to: recipient, subjectPrefix } = resolveEmailRecipient(user.email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.CRON_SENDER_EMAIL,
      to: [recipient],
      subject: `${subjectPrefix}${subject}`,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API failed: ${errText}`);
  }

  await markCronAsSentToday("subscriptions", user.uid, todayDateStr);

  return { sent: true, emailed: upcomingRenewals.length };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.RESEND_API_KEY) {
      reportCronAbort("subscriptions", "Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const force = req.nextUrl.searchParams.get("force") === "true";

    // 2. Fan out across every registered user via Admin SDK.
    const users = await listAllUsers();

    const results: CronUserResult[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, env.RESEND_API_KEY, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/subscriptions for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    reportCronFailures("subscriptions", results);

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, usersProcessed: users.length, emailsSent: sentCount, results });
  } catch (error: any) {
    return toErrorResponse(error, "Error in cron/subscriptions");
  }
}
