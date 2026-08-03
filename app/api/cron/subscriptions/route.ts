import { NextRequest, NextResponse } from "next/server";
import { listAllUsers, adminListSubscriptions, type AdminUser } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; emailed: number };

async function processUser(user: AdminUser, resendApiKey: string): Promise<ProcessResult> {
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

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <meta charset="utf-8">
  <title>Upcoming Renewals</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f3ec !important; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; border-spacing: 0; }
    .txt-main  { color: #1c1b18 !important; -webkit-text-fill-color: #1c1b18 !important; }
    .txt-muted { color: #7c7a72 !important; -webkit-text-fill-color: #7c7a72 !important; }
    .txt-green { color: #16a34a !important; -webkit-text-fill-color: #16a34a !important; }
    .txt-red   { color: #dc2626 !important; -webkit-text-fill-color: #dc2626 !important; }
    .txt-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
    .txt-warn  { color: #b45309 !important; -webkit-text-fill-color: #b45309 !important; }
    .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .font-serif { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .font-mono  { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bento-card {
      background-color: #fcfbfa !important;
      background-image: linear-gradient(#fcfbfa, #fcfbfa) !important;
      border: 1px solid #eae8e0;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(28,27,24,0.02);
    }
    .btn-primary {
      display: inline-block;
      background-color: #1c1b18 !important;
      background-image: linear-gradient(#1c1b18, #1c1b18) !important;
      color: #ffffff !important;
      -webkit-text-fill-color: #ffffff !important;
      font-size: 13px; font-weight: 600;
      text-decoration: none; padding: 12px 24px; border-radius: 6px;
    }
    .cat-bar-bg {
      height: 6px;
      background-color: #e5e5e5 !important;
      background-image: linear-gradient(#e5e5e5,#e5e5e5) !important;
      border-radius: 3px; overflow: hidden;
    }
    .cat-bar {
      height: 100%;
      background-color: #1c1b18 !important;
      background-image: linear-gradient(#1c1b18,#1c1b18) !important;
      border-radius: 3px;
    }
  </style>
</head>
<body class="font-sans" style="background-color:#f4f3ec;margin:0;padding:0;">
  <table width="100%" bgcolor="#f4f3ec" cellpadding="0" cellspacing="0" style="background-color:#f4f3ec;background-image:linear-gradient(#f4f3ec,#f4f3ec)!important;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:680px;" cellpadding="0" cellspacing="0">

          <!-- Header -->
          <tr>
            <td style="border-bottom:1px solid #eae8e0;padding-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td align="left" class="txt-main font-sans" style="font-size:16px;font-weight:500;">
                  Continuum Home
                </td>
                <td align="right"><span class="font-sans txt-white" style="font-size:9px;font-weight:700;background-color:#b45309;background-image:linear-gradient(#b45309,#b45309);padding:4px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Alert</span></td>
              </tr></table>
            </td>
          </tr>
          <tr><td height="32"></td></tr>
        <!-- Title -->
        <tr><td align="left">
          <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">Upcoming Subscription Renewals</h1>
          <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Heads up! The following subscriptions are renewing in the next 2–3 days.</p>
        </td></tr>

        <!-- Subscription list -->
        <tr><td>
          ${upcomingRenewals.map((sub)=>{
            const billingDate=new Date(sub.nextBillingDate+'T00:00:00');
            const diffDays=Math.ceil((billingDate.getTime()-today.getTime())/(1000*60*60*24));
            return `
            <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:2px solid #b45309;margin-bottom:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" valign="middle">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td align="center" valign="middle" style="font-size:24px;width:44px;height:44px;background-color:#eae8e0;border-radius:8px;">
                        ${sub.icon||'💳'}
                      </td>
                      <td valign="middle" style="padding-left:16px;">
                        <div class="font-sans txt-main" style="font-size:15px;font-weight:600;line-height:1.2;">${sub.name}</div>
                        <div class="font-mono txt-warn" style="font-size:9px;font-weight:700;background-color:#fef3c7!important;background-image:linear-gradient(#fef3c7,#fef3c7)!important;padding:3px 6px;border-radius:4px;margin-top:6px;display:inline-block;">RENEWING IN ${diffDays} DAYS</div>
                      </td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <div class="font-sans txt-main" style="font-size:18px;font-weight:700;">₹${sub.cost.toFixed(2)}</div>
                    <div class="font-sans txt-muted" style="font-size:11px;font-weight:500;margin-top:4px;">${sub.billingCycle==='yearly'?'Yearly':'Monthly'} • ${sub.nextBillingDate}</div>
                  </td>
                </tr></table>
              </td></tr>
            </table>`;
          }).join('')}
        </td></tr>


          <!-- Footer -->
          <tr>
            <td align="center" style="padding:48px 0 24px 0;border-top:1px solid #eae8e0;margin-top:32px;display:block;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn-primary font-sans">Manage Subscriptions</a>
              <p class="font-sans txt-muted" style="font-size:11px;margin-top:16px;">This is an automated security alert from your dashboard.</p>
            </td>
          </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CRON_SENDER_EMAIL || "Personal Dashboard <onboarding@resend.dev>",
      to: [user.email],
      subject: `Alert: ${upcomingRenewals.length} Upcoming Subscription Renewals`,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API failed: ${errText}`);
  }

  return { sent: true, emailed: upcomingRenewals.length };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    // 2. Fan out across every registered user via Admin SDK.
    const users = await listAllUsers();

    const results: { uid: string; email: string; sent: boolean; reason?: string; error?: string }[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, resendApiKey);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/subscriptions for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, usersProcessed: users.length, emailsSent: sentCount, results });
  } catch (error: any) {
    console.error("Error in cron/subscriptions:", error);
    return NextResponse.json({ error: error.message || "Failed to run subscription alert cron" }, { status: 500 });
  }
}
