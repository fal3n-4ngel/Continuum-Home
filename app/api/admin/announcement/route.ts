import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listAllUsers } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

const SHARED_CSS = `
  :root { color-scheme: light; supported-color-schemes: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background-color: #f4f3ec !important; -webkit-font-smoothing: antialiased; }
  table { border-collapse: collapse; border-spacing: 0; }
  .txt-main  { color: #1c1b18 !important; -webkit-text-fill-color: #1c1b18 !important; }
  .txt-muted { color: #7c7a72 !important; -webkit-text-fill-color: #7c7a72 !important; }
  .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .font-serif { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
  .bento-card {
    background-color: #fcfbfa !important;
    border: 1px solid #eae8e0;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(28,27,24,0.02);
    padding: 32px;
  }
  .btn-primary {
    display: inline-block;
    background-color: #1c1b18 !important;
    background-image: linear-gradient(#1c1b18, #1c1b18) !important;
    color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;
    font-size: 13px; font-weight: 600;
    text-decoration: none; padding: 12px 24px; border-radius: 6px;
  }
`;

function wrap(body: string) {
  return `
  <table width="100%" bgcolor="#f4f3ec" cellpadding="0" cellspacing="0" style="background-color:#f4f3ec;background-image:linear-gradient(#f4f3ec,#f4f3ec)!important;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">
        ${body}
      </table>
    </td></tr>
  </table>`;
}

function htmlDoc(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${SHARED_CSS}</style>
</head>
<body class="font-sans" style="background-color:#f4f3ec;margin:0;padding:0;">
  ${body}
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    if (session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
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

    const appUrl = process.env.APP_URL || "https://continuuuum.vercel.app";
    const sender = process.env.CRON_SENDER_EMAIL || "Continuum Home <onboarding@resend.dev>";

    // Build the beautiful announcement email body HTML
    const emailBody = wrap(`
      <tr><td style="border-bottom:1px solid #eae8e0;padding-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="left" class="txt-main font-sans" style="font-size:16px;font-weight:500;">Continuum Home</td>
          <td align="right" class="txt-muted font-sans" style="font-size:12px;">Announcement</td>
        </tr></table>
      </td></tr>
      <tr><td height="28"></td></tr>
      ${action === "preview" ? `
      <tr><td style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;margin-bottom:20px;">
        <span style="font-size:11px;font-weight:700;color:#92400e;font-family:ui-monospace,monospace;">⚡ ANNOUNCEMENT PREVIEW — Sent to administrative inbox only.</span>
      </td></tr>
      <tr><td height="20"></td></tr>
      ` : ""}
      <tr><td>
        <table width="100%" class="bento-card" cellpadding="0" cellspacing="0">
          <tr><td align="left">
            <h1 class="font-serif txt-main" style="font-size:26px;font-weight:normal;margin:0 0 16px 0;line-height:1.3;">${title}</h1>
            <div class="font-sans txt-main" style="font-size:14px;line-height:1.6;white-space:pre-wrap;color:#2e2d27;">${content}</div>
          </td></tr>
          <tr><td height="32"></td></tr>
          <tr><td align="center" style="border-top:1px solid #eae8e0;padding-top:24px;">
            <a href="${appUrl}" class="btn-primary font-sans">Open Dashboard</a>
            <p class="font-sans txt-muted" style="font-size:10px;margin-top:16px;color:#8c8a80;">Continuum — steady flow of life progression.</p>
          </td></tr>
        </table>
      </td></tr>
    `);

    const finalHtml = htmlDoc(subject, emailBody);

    if (action === "preview") {
      // Send only to admin
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sender,
          to: [ADMIN_EMAIL],
          subject: `[ANNOUNCEMENT PREVIEW] ${subject}`,
          html: finalHtml,
        }),
      });

      if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
      return NextResponse.json({ success: true, message: `Preview sent to ${ADMIN_EMAIL}` });
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
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: sender,
                to: [email],
                subject,
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
