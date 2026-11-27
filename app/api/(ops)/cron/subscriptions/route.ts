import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  listAllUsers,
  adminListSubscriptions,
  adminGetEmailSubscriptions,
  adminCreateIdempotentExpense,
  adminUpdateSubscription,
  adminFindUsersByEmails,
  adminSyncSharedSubscription,
  adminIsGuestEmailUnsubscribed,
  type AdminUser,
} from "@/lib/firebase/firebase-admin";
import { collectDueBillingDates, buildRecurringExpenseEntry } from "@/lib/finance";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron";
import { getIstDateString } from "@/lib/utils";
import { reportCronFailures, type CronUserResult } from "@/lib/cron";
import { withCron } from "@/lib/utils/route-handlers";
import { buildUnsubscribeUrl, buildGuestUnsubscribeUrl } from "@/lib/auth";
import { buildSubscriptionsEmail, buildFamilyMemberSubscriptionEmail } from "@/emails/templates/subscriptions";
import { env, resolveEmailRecipient } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string; familyEmailsSent?: number } | { sent: true; emailed: number; familyEmailsSent: number };

async function sendFamilyMemberReminders(
  owner: AdminUser,
  upcomingRenewals: Awaited<ReturnType<typeof adminListSubscriptions>>,
  today: Date,
  todayDateStr: string,
  resendApiKey: string,
  force: boolean
): Promise<number> {
  const familySubs = upcomingRenewals.filter(
    (s) => s.isFamilyPlan && s.sendMemberEmails !== false && s.familyMembers && s.familyMembers.length > 0
  );
  if (familySubs.length === 0) return 0;

  const allEmails = familySubs.flatMap((s) => (s.familyMembers || []).map((m) => m.email));
  const continuumUsers = await adminFindUsersByEmails(allEmails);
  let sentCount = 0;

  for (const sub of familySubs) {
    const members = sub.familyMembers || [];
    const totalMembers = members.length + 1;
    const defaultShare = sub.cost / totalMembers;
    const daysUntil = Math.ceil(
      (new Date(sub.nextBillingDate + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const member of members) {
      const normalizedEmail = member.email.trim().toLowerCase();
      if (!normalizedEmail || normalizedEmail === owner.email.toLowerCase()) continue;

      const memberHash = createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 16);
      const cronJobKey = `sub-family:${sub.id}`;

      if (!force) {
        const alreadySent = await hasCronBeenSentToday(cronJobKey, memberHash, todayDateStr);
        if (alreadySent) continue;
      }

      const continuumUser = continuumUsers.get(normalizedEmail);
      if (continuumUser) {
        const prefs = await adminGetEmailSubscriptions(continuumUser.uid);
        if (!prefs.subscriptions) continue;
      } else {
        const guestOptedOut = await adminIsGuestEmailUnsubscribed(normalizedEmail);
        if (guestOptedOut) continue;
      }

      const unsubscribeUrl = continuumUser
        ? buildUnsubscribeUrl(continuumUser.uid, "subscriptions")
        : buildGuestUnsubscribeUrl(normalizedEmail);
      const memberShare = typeof member.share === "number" ? member.share : defaultShare;

      const { subject, html } = buildFamilyMemberSubscriptionEmail({
        subscription: {
          name: sub.name,
          icon: sub.icon,
          cost: sub.cost,
          billingCycle: sub.billingCycle,
          nextBillingDate: sub.nextBillingDate,
          daysUntil,
        },
        memberName: member.name,
        memberShare,
        totalMembers,
        ownerEmail: owner.email,
        isContinuumUser: Boolean(continuumUser),
        appUrl: env.APP_URL,
        unsubscribeUrl,
      });

      const { to: recipient, subjectPrefix } = resolveEmailRecipient(normalizedEmail);
      const headers: Record<string, string> = {};
      if (unsubscribeUrl) {
        headers["List-Unsubscribe"] = `<${unsubscribeUrl}>`;
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.CRON_SENDER_EMAIL,
          to: [recipient],
          subject: `${subjectPrefix}${subject}`,
          html,
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to send family reminder to ${normalizedEmail} for ${sub.id}: ${errText}`);
        continue;
      }

      await markCronAsSentToday(cronJobKey, memberHash, todayDateStr);
      sentCount++;
    }
  }

  return sentCount;
}

async function processUser(user: AdminUser, resendApiKey: string, force: boolean = false): Promise<ProcessResult> {
  const todayDateStr = getIstDateString();
  const subscriptions = await adminListSubscriptions(user.uid);
  for (const sub of subscriptions) {
    if (!sub.autoPost || !sub.nextBillingDate || sub.nextBillingDate > todayDateStr) continue;
    const { dueDates, nextDate } = collectDueBillingDates(sub.nextBillingDate, sub.billingCycle, todayDateStr);
    let lastPosted: string | null = sub.lastAutoPostedDate ?? null;
    for (const dueDate of dueDates) {
      const entry = buildRecurringExpenseEntry(sub, dueDate);
      if (entry.idempotencyKey) {
        await adminCreateIdempotentExpense(user.uid, entry.idempotencyKey, {
          title: entry.title,
          amount: entry.amount,
          category: entry.category,
          date: dueDate,
          notes: entry.notes,
          type: entry.type,
          tags: entry.tags,
        });
        lastPosted = dueDate;
      }
    }
    if (dueDates.length > 0) {
      await adminUpdateSubscription(user.uid, sub.id, {
        nextBillingDate: nextDate,
        ...(lastPosted ? { lastAutoPostedDate: lastPosted } : {}),
      });
      if (sub.isFamilyPlan && sub.familyMembers && sub.familyMembers.length > 0) {
        await adminSyncSharedSubscription(
          user.uid,
          user.email,
          { ...sub, nextBillingDate: nextDate },
          sub.id
        );
      }
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingRenewals = subscriptions.filter((sub) => {
    if (!sub.nextBillingDate || sub.type === "income") return false;
    const billingDate = new Date(sub.nextBillingDate + "T00:00:00");
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 2 || diffDays === 3;
  });

  if (upcomingRenewals.length === 0) {
    return { sent: false, reason: "no renewals in the 2-3 day window", familyEmailsSent: 0 };
  }

  const familyEmailsSent = await sendFamilyMemberReminders(user, upcomingRenewals, today, todayDateStr, resendApiKey, force);

  if (!force) {
    const alreadySent = await hasCronBeenSentToday("subscriptions", user.uid, todayDateStr);
    if (alreadySent) {
      return { sent: false, reason: "subscription email already sent today (deduplicated)", familyEmailsSent };
    }
  }
  const emailPrefs = await adminGetEmailSubscriptions(user.uid);
  if (!emailPrefs.subscriptions) {
    return { sent: false, reason: "user unsubscribed from subscription renewal emails", familyEmailsSent };
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

  return { sent: true, emailed: upcomingRenewals.length, familyEmailsSent };
}

export const POST = withCron(
  "subscriptions",
  async (req) => {
    const force = req.nextUrl.searchParams.get("force") === "true";
    const users = await listAllUsers();

    const results: CronUserResult[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, env.RESEND_API_KEY, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err) {
        console.error(`Error in cron/subscriptions for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    reportCronFailures("subscriptions", results);

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, usersProcessed: users.length, emailsSent: sentCount, results });
  },
  { requireResend: true }
);
