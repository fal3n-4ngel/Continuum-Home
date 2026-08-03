import { NextRequest, NextResponse } from "next/server";
import { listAllUsers, adminListExpenses, type AdminUser } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; total: number };

async function processUser(user: AdminUser, period: "weekly" | "monthly", daysLimit: number, resendApiKey: string): Promise<ProcessResult> {
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

  const periodTitle = period === "monthly" ? "Monthly Expense Summary" : "Weekly Expense Summary";
  const periodRange = `${cutoffStr} to ${today.toISOString().slice(0, 10)}`;

  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <meta charset="utf-8">
  <title>${periodTitle}</title>
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
                  Continuum Dashboard
                </td>
                <td align="right"><span class="font-sans txt-white" style="font-size:9px;font-weight:700;background-color:#1c1b18;background-image:linear-gradient(#1c1b18,#1c1b18);padding:4px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${period}</span></td>
              </tr></table>
            </td>
          </tr>
          <tr><td height="32"></td></tr>
        <!-- Title -->
        <tr><td align="left">
          <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">${periodTitle}</h1>
          <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Reporting Period: ${periodRange}</p>
        </td></tr>

        <!-- Hero card: blue like dashboard "Total Spent" -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#bfdbfe!important;background-image:linear-gradient(#bfdbfe,#bfdbfe)!important;border:1px solid #93c5fd;border-top:3px solid #3b82f6;border-radius:12px;margin-bottom:24px;">
            <tr><td align="center" style="padding:24px;">
              <div class="font-mono" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;">Total Outflow</div>
              <div class="font-sans" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;">₹${totalAmount.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              <div class="font-sans" style="font-size:13px;font-weight:500;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;">
                Average of <strong>₹${avgDaily.toFixed(2)}</strong> per day
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Category Distribution -->
        <tr><td align="left">
          <h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:16px 0;">Spending by Category</h2>
        </td></tr>
        <tr><td class="bento-card" style="padding:24px;">
          ${categoryBreakdown.map((cat)=>`
          <div style="margin-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td align="left" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">
                  ${cat.name} <span class="txt-muted" style="font-weight:normal;font-size:12px;">(${cat.percentage.toFixed(1)}%)</span>
                </td>
                <td align="right" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">
                  ₹${cat.amount.toFixed(2)}
                </td>
              </tr>
            </table>
            <div class="cat-bar-bg"><div class="cat-bar" style="width:${cat.percentage}%"></div></div>
          </div>`).join('')}
        </td></tr>

        <!-- Top Outflows -->
        <tr><td align="left">
          <h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:32px 0 16px 0;">Top Outflows</h2>
        </td></tr>
        <tr><td class="bento-card" style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr>
              <th align="left" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">Item / Category</th>
              <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;width:80px;">Date</th>
              <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;width:100px;">Amount</th>
            </tr></thead>
            <tbody>
              ${topExpenses.map((exp)=>`
              <tr>
                <td align="left" style="padding:14px 0;border-bottom:1px solid #f4f3ec;">
                  <div class="font-sans txt-main" style="font-weight:600;font-size:13px;">${exp.title}</div>
                  <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${exp.category||'Uncategorized'}</div>
                </td>
                <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">${exp.date}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:12px;font-weight:700;">₹${(exp.amount||0).toFixed(2)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </td></tr>


          <!-- Footer -->
          <tr>
            <td align="center" style="padding:48px 0 24px 0;border-top:1px solid #eae8e0;margin-top:32px;display:block;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn-primary font-sans">View Ledger</a>
              <p class="font-sans txt-muted" style="font-size:11px;margin-top:16px;">This is an automated summary email generated from your dashboard.</p>
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
      subject: `${periodTitle}: ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent`,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API failed: ${errText}`);
  }

  return { sent: true, total: totalAmount };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify cron secret key
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "monthly" ? "monthly" : "weekly";
    const daysLimit = period === "monthly" ? 30 : 7;

    // 2. Fan out across every registered user via Admin SDK.
    const users = await listAllUsers();

    const results: { uid: string; email: string; sent: boolean; reason?: string; error?: string }[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, period, daysLimit, resendApiKey);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/expenses for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, period, usersProcessed: users.length, emailsSent: sentCount, results });
  } catch (error: any) {
    console.error("Error in cron/expenses:", error);
    return NextResponse.json({ error: error.message || "Failed to run expense summary cron" }, { status: 500 });
  }
}
