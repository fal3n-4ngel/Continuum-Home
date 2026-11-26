import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import { listAllUsers } from "@/lib/firebase/firebase-admin";
import { notifyAdminAnnouncement } from "@/lib/alerts";
import { env, resolveEmailRecipient } from "@/lib/utils";
import { buildAnnouncementEmail } from "@/emails/templates/announcement";

export const dynamic = "force-dynamic";

const RESEND_BATCH_SIZE = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendResendBatch(
  payloads: Array<{ from: string; to: string[]; subject: string; html: string }>
): Promise<boolean> {
  const send = () =>
    fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payloads),
    });

  let res = await send();
  if (res.status === 429) {
    await sleep(1100);
    res = await send();
  }
  return res.ok;
}

export const POST = withAdmin("POST /api/admin/announcement", async (req) => {
  if (!env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, subject, title, content, excludeEmails } = body;

  if (!action || !["preview", "send"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Must be 'preview' or 'send'." }, { status: 400 });
  }
  if (!subject || !title || !content) {
    return NextResponse.json({ error: "Missing required fields: subject, title, content" }, { status: 400 });
  }

  const appUrl = env.APP_URL;
  const sender = env.CRON_SENDER_EMAIL;

  const preview = action === "preview";
  const built = buildAnnouncementEmail({ subject, title, content, appUrl, isPreview: preview });
  const finalHtml = built.html;

  if (action === "preview") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: [env.ADMIN_EMAIL],
        subject: built.subject,
        html: finalHtml,
      }),
    });

    if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
    return NextResponse.json({ success: true, message: `Preview sent to ${env.ADMIN_EMAIL}` });
  } else {
    const excluded = new Set(
      Array.isArray(excludeEmails)
        ? excludeEmails.map((e: unknown) => String(e).trim().toLowerCase())
        : []
    );

    const users = await listAllUsers();
    const validEmails = users
      .map((u) => u.email)
      .filter(
        (email): email is string =>
          typeof email === "string" &&
          email.length > 0 &&
          !excluded.has(email.trim().toLowerCase())
      );

    if (validEmails.length === 0) {
      return NextResponse.json({ success: true, message: "No registered users to send to." });
    }

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validEmails.length; i += RESEND_BATCH_SIZE) {
      if (i > 0) await sleep(600);
      const chunk = validEmails.slice(i, i + RESEND_BATCH_SIZE);
      const payloads = chunk.map((email) => {
        const { to: recipient, subjectPrefix } = resolveEmailRecipient(email);
        return {
          from: sender,
          to: [recipient],
          subject: `${subjectPrefix}${subject}`,
          html: finalHtml,
        };
      });

      try {
        const ok = await sendResendBatch(payloads);
        if (ok) {
          successCount += chunk.length;
        } else {
          failedCount += chunk.length;
        }
      } catch {
        failedCount += chunk.length;
      }
    }

    notifyAdminAnnouncement({
      subject: String(subject),
      total: validEmails.length,
      successCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Announcement broadcast complete.`,
      details: { total: validEmails.length, success: successCount, failed: failedCount },
    });
  }
});
