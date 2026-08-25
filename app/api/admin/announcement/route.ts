import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listAllUsers } from "@/lib/firebase-admin";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/discord";
import { env, resolveEmailRecipient } from "@/lib/env";
import { buildAnnouncementEmail } from "@/emails/templates/announcement";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    if (session.user.email !== env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, subject, title, content } = body;

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
      // Send only to admin
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
      // Send to all users
      const users = await listAllUsers();
      const validEmails = users
        .map((u) => u.email)
        .filter((email): email is string => typeof email === "string" && email.length > 0);

      if (validEmails.length === 0) {
        return NextResponse.json({ success: true, message: "No registered users to send to." });
      }

      // Send emails
      const results = await Promise.all(
        validEmails.map(async (email) => {
          try {
            const { to: recipient, subjectPrefix } = resolveEmailRecipient(email);
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: sender,
                to: [recipient],
                subject: `${subjectPrefix}${subject}`,
                html: finalHtml,
              }),
            });
            return { email, success: res.ok };
          } catch (e) {
            return { email, success: false };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.length - successCount;

      waitUntil(sendDiscordEmbed(
        "Admin Audit Log",
        `Admin broadcasted an announcement: **${subject}**\nDelivered to ${successCount} users (${failedCount} failed).`,
        10181046, // Purple Hex
        "Continuum Dashboard • Admin Audit"
      ));

      return NextResponse.json({
        success: true,
        message: `Announcement broadcast complete.`,
        details: { total: validEmails.length, success: successCount, failed: failedCount }
      });
    }
  } catch (err: any) {
    console.error("Announcement API error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch announcement." }, { status: 500 });
  }
}
