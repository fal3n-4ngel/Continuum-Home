import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { listAllUsers, adminListExpenses, adminGetEmailSubscriptions, type AdminUser } from "@/lib/firebase-admin";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron-guard";
import { getIstDateString } from "@/lib/dates";
import { reportCronFailures, reportCronAbort, type CronUserResult } from "@/lib/cron-alert";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { buildExpensesEmail, expensesPeriodTitle } from "@/emails/templates/expenses";
import { env, resolveEmailRecipient } from "@/lib/env";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; total: number };

async function processUser(user: AdminUser, period: "weekly" | "monthly", daysLimit: number, resendApiKey: string, force: boolean = false): Promise<ProcessResult> {
  const todayDateStr = getIstDateString();
  const cronKey = `expenses_${period}`;
  if (!force) {
    const alreadySent = await hasCronBeenSentToday(cronKey, user.uid, todayDateStr);
    if (alreadySent) {
      return { sent: false, reason: `expense ${period} summary email already sent today (deduplicated)` };
    }
  }
  const emailPrefs = await adminGetEmailSubscriptions(user.uid);
  if (!emailPrefs.expenses) {
    return { sent: false, reason: "user unsubscribed from expense summary emails" };
  }
  const allExpenses = await adminListExpenses(user.uid);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoffDate = new Date();
  cutoffDate.setDate(today.getDate() - daysLimit);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const periodExpenses = allExpenses.filter((e) => e.date && e.date >= cutoffStr && e.amount !== null);
  if (periodExpenses.length === 0) {
    return { sent: false, reason: `no expenses in the last ${daysLimit} days` };
  }

  const totalAmount = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const avgDaily = totalAmount / daysLimit;

  const categoryTotals: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    const cat = e.category || "Uncategorized";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
  });

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([name, amount]) => ({ name, amount, percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);

  const topExpenses = [...periodExpenses].sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, 5);

  const periodTitle = expensesPeriodTitle(period);
  const periodRange = `${cutoffStr} to ${today.toISOString().slice(0, 10)}`;
  const unsubscribeUrl = buildUnsubscribeUrl(user.uid, "expenses");

  const { subject, html } = buildExpensesEmail({
    period,
    periodRange,
    totalAmount,
    avgDaily,
    categories: categoryBreakdown,
    topExpenses,
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

  await markCronAsSentToday(cronKey, user.uid, todayDateStr);

  return { sent: true, total: totalAmount };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify cron secret key
    const authHeader = req.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!env.RESEND_API_KEY) {
      reportCronAbort("expenses", "Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "monthly" ? "monthly" : "weekly";
    const daysLimit = period === "monthly" ? 30 : 7;
    const force = searchParams.get("force") === "true";

    // 2. Fan out across every registered user via Admin SDK.
    const users = await listAllUsers();

    const results: CronUserResult[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, period, daysLimit, env.RESEND_API_KEY, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/expenses for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    reportCronFailures(`expenses (${period})`, results);

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, period, usersProcessed: users.length, emailsSent: sentCount, results });
  } catch (error: any) {
    return toErrorResponse(error, "Error in cron/expenses");
  }
}
