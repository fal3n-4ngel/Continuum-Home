import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── Shared CSS (identical to what the cron templates use) ────────────────────
const SHARED_CSS = `
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
      color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;
      font-size: 13px; font-weight: 600;
      text-decoration: none; padding: 12px 24px; border-radius: 6px;
    }
    .cat-bar-bg {
      height: 6px; background-color: #e5e5e5 !important;
      background-image: linear-gradient(#e5e5e5,#e5e5e5) !important;
      border-radius: 3px; overflow: hidden;
    }
    .cat-bar {
      height: 100%; background-color: #1c1b18 !important;
      background-image: linear-gradient(#1c1b18,#1c1b18) !important; border-radius: 3px;
    }`;

// ─── Shared wrappers ──────────────────────────────────────────────────────────
function header(rightHtml: string) {
  return `
          <tr><td style="border-bottom:1px solid #eae8e0;padding-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="left" class="txt-main font-sans" style="font-size:16px;font-weight:500;">Continuum Home</td>
              <td align="right">${rightHtml}</td>
            </tr></table>
          </td></tr>
          <tr><td height="32"></td></tr>
          <tr><td style="background-color:#fef3c7;background-image:linear-gradient(#fef3c7,#fef3c7);border:1px solid #fde68a;border-radius:8px;padding:10px 16px;">
            <span style="font-size:11px;font-weight:700;color:#92400e;font-family:ui-monospace,monospace;">⚡ EMAIL PREVIEW — Sample data only. Not your real data.</span>
          </td></tr>
          <tr><td height="24"></td></tr>`;
}

function footer(btnLabel: string, note: string, appUrl: string) {
  return `
          <tr><td align="center" style="padding:48px 0 24px 0;border-top:1px solid #eae8e0;display:block;">
            <a href="${appUrl}" class="btn-primary font-sans">${btnLabel}</a>
            <p class="font-sans txt-muted" style="font-size:11px;margin-top:16px;">${note}</p>
          </td></tr>`;
}

function wrap(body: string) {
  return `
  <table width="100%" bgcolor="#f4f3ec" cellpadding="0" cellspacing="0" style="background-color:#f4f3ec;background-image:linear-gradient(#f4f3ec,#f4f3ec)!important;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:680px;" cellpadding="0" cellspacing="0">
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

// ─── Email builders ───────────────────────────────────────────────────────────

function buildPortfolioEmail(appUrl: string, todayStr: string): { html: string; subject: string } {
  const totalCurrent = 125430.75;
  const totalInvested = 112000;
  const overallPnl = totalCurrent - totalInvested;
  const overallPnlPercent = (overallPnl / totalInvested) * 100;
  const isGreen = overallPnl >= 0;
  const dailyChange = 1843.2;
  const weeklyChange = 5210.5;
  const usdToInr = 83.94;
  const assets = [
    { name: "RELIANCE.NS", category: "equity", quantity: 10, currentPrice: 2945.6, currentValue: 29456, pnl: 2456, pnlPercent: 9.09 },
    { name: "BTC-USD",     category: "crypto",  quantity: 0.15, currentPrice: 5612800, currentValue: 84192, pnl: 4192, pnlPercent: 5.24 },
    { name: "INFY.NS",     category: "equity",  quantity: 20, currentPrice: 1732.4, currentValue: 34648, pnl: 2648, pnlPercent: 8.28 },
  ];

  const body = wrap(`
    ${header(`<span class="font-sans txt-muted" style="font-size:12px;">${todayStr}</span>`)}
    <tr><td align="left">
      <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">Daily Portfolio Close</h1>
      <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Indian Market Close Wrap-Up (5:30 PM IST)</p>
    </td></tr>

    <tr><td>
      <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:3px solid ${isGreen ? "#22c55e" : "#ef4444"};margin-bottom:16px;">
        <tr><td align="center" style="padding:24px;">
          <div class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Net Asset Valuation</div>
          <div class="font-sans txt-main" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;">₹${totalCurrent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div class="font-sans ${isGreen ? "txt-green" : "txt-red"}" style="font-size:14px;font-weight:700;">
            ${isGreen ? "▲ +" : "▼ -"}₹${Math.abs(overallPnl).toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${overallPnlPercent.toFixed(2)}%)
          </div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
        <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
          <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Invested Capital</div>
          <div class="font-sans txt-main" style="font-size:20px;font-weight:bold;margin-top:6px;">₹${totalInvested.toLocaleString("en-IN")}</div>
        </td>
        <td width="3.5%"></td>
        <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
          <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Today's P&amp;L (1D)</div>
          <div class="font-sans txt-green" style="font-size:20px;font-weight:bold;margin-top:6px;">▲ +₹${dailyChange.toLocaleString("en-IN")}</div>
        </td>
        <td width="3.5%"></td>
        <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
          <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">7-Day Change (1W)</div>
          <div class="font-sans txt-green" style="font-size:20px;font-weight:bold;margin-top:6px;">▲ +₹${weeklyChange.toLocaleString("en-IN")}</div>
        </td>
      </tr></table>
    </td></tr>

    <tr><td align="left"><h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:16px 0;">Active Holdings Ledger</h2></td></tr>
    <tr><td class="bento-card" style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead><tr>
          <th align="left" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">Asset / Class</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">Qty</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">CMP</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">Value</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">P&amp;L</th>
        </tr></thead>
        <tbody>
          ${assets.map(a => `<tr>
            <td align="left" style="padding:14px 0;border-bottom:1px solid #f4f3ec;">
              <div class="font-sans txt-main" style="font-weight:600;font-size:12px;">${a.name}</div>
              <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${a.category}</div>
            </td>
            <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">${a.quantity}</td>
            <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">₹${a.currentPrice.toLocaleString("en-IN")}</td>
            <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;font-weight:600;">₹${a.currentValue.toLocaleString("en-IN")}</td>
            <td align="right" class="font-mono ${a.pnl >= 0 ? "txt-green" : "txt-red"}" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;font-weight:600;">
              ${a.pnl >= 0 ? "+" : ""}₹${a.pnl.toLocaleString("en-IN")}
              <div class="txt-muted" style="font-size:9px;font-weight:normal;margin-top:3px;">(${a.pnlPercent.toFixed(1)}%)</div>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td></tr>
    ${footer("Open Personal Dashboard", `Automated daily wrap-up from your dashboard.<br>USD to INR Rate: ₹${usdToInr}`, appUrl)}
  `);

  return { html: htmlDoc("Daily Portfolio Close", body), subject: `[PREVIEW] Daily Portfolio Close — ${todayStr}` };
}

function buildExpensesEmail(period: "weekly" | "monthly", appUrl: string, todayStr: string): { html: string; subject: string } {
  const isWeekly = period === "weekly";
  const periodTitle = isWeekly ? "Weekly Expense Summary" : "Monthly Expense Summary";
  const periodRange = isWeekly ? "Last 7 days" : "Last 30 days";
  const totalAmount = isWeekly ? 8340.5 : 32750.0;
  const avgDaily = isWeekly ? 1191.5 : 1091.67;
  const categories = [
    { name: "Food", amount: isWeekly ? 2800 : 10200, percentage: isWeekly ? 33.6 : 31.2 },
    { name: "Transport", amount: isWeekly ? 1900 : 7400, percentage: isWeekly ? 22.8 : 22.6 },
    { name: "Rent", amount: isWeekly ? 1500 : 6000, percentage: isWeekly ? 18.0 : 18.3 },
    { name: "Entertainment", amount: isWeekly ? 840 : 3800, percentage: isWeekly ? 10.1 : 11.6 },
    { name: "Shopping", amount: isWeekly ? 680 : 3200, percentage: isWeekly ? 8.2 : 9.8 },
    { name: "Other", amount: isWeekly ? 620.5 : 2150, percentage: isWeekly ? 7.3 : 6.5 },
  ];
  const topExpenses = [
    { title: "Monthly Rent", category: "rent", date: "01 Aug", amount: 6000 },
    { title: "Swiggy Order", category: "food", date: "31 Jul", amount: 840 },
    { title: "Ola Ride", category: "transport", date: "30 Jul", amount: 420 },
    { title: "Netflix", category: "entertainment", date: "28 Jul", amount: 649 },
    { title: "Grocery Run", category: "food", date: "27 Jul", amount: 1240 },
  ];

  const body = wrap(`
    ${header(`<span class="font-sans txt-white" style="font-size:9px;font-weight:700;background-color:#1c1b18;background-image:linear-gradient(#1c1b18,#1c1b18);padding:4px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${period}</span>`)}
    <tr><td align="left">
      <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">${periodTitle}</h1>
      <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Reporting Period: ${periodRange}</p>
    </td></tr>

    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#bfdbfe!important;background-image:linear-gradient(#bfdbfe,#bfdbfe)!important;border:1px solid #93c5fd;border-top:3px solid #3b82f6;border-radius:12px;margin-bottom:24px;">
        <tr><td align="center" style="padding:24px;">
          <div class="font-mono" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;">Total Outflow</div>
          <div class="font-sans" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;">₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div class="font-sans" style="font-size:13px;font-weight:500;color:#1e3a8a!important;-webkit-text-fill-color:#1e3a8a!important;">Average of <strong>₹${avgDaily.toFixed(2)}</strong> per day</div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="left"><h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:16px 0;">Spending by Category</h2></td></tr>
    <tr><td class="bento-card" style="padding:24px;">
      ${categories.map(cat => `
      <div style="margin-bottom:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
          <td align="left" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">
            ${cat.name} <span class="txt-muted" style="font-weight:normal;font-size:12px;">(${cat.percentage.toFixed(1)}%)</span>
          </td>
          <td align="right" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">₹${cat.amount.toFixed(2)}</td>
        </tr></table>
        <div class="cat-bar-bg"><div class="cat-bar" style="width:${cat.percentage}%"></div></div>
      </div>`).join("")}
    </td></tr>

    <tr><td align="left"><h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:32px 0 16px 0;">Top Outflows</h2></td></tr>
    <tr><td class="bento-card" style="padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead><tr>
          <th align="left" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;">Item / Category</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;width:80px;">Date</th>
          <th align="right" class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid #eae8e0;width:100px;">Amount</th>
        </tr></thead>
        <tbody>
          ${topExpenses.map(exp => `<tr>
            <td align="left" style="padding:14px 0;border-bottom:1px solid #f4f3ec;">
              <div class="font-sans txt-main" style="font-weight:600;font-size:13px;">${exp.title}</div>
              <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${exp.category}</div>
            </td>
            <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">${exp.date}</td>
            <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:12px;font-weight:700;">₹${exp.amount.toFixed(2)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </td></tr>
    ${footer("View Ledger", "Automated summary email from your dashboard.", appUrl)}
  `);

  return { html: htmlDoc(periodTitle, body), subject: `[PREVIEW] ${periodTitle} — ${todayStr}` };
}

function buildSubscriptionsEmail(appUrl: string, todayStr: string): { html: string; subject: string } {
  const renewals = [
    { name: "Netflix", icon: "🎬", cost: 649, billingCycle: "monthly", nextBillingDate: "2026-08-04", diffDays: 2 },
    { name: "Spotify", icon: "🎵", cost: 119, billingCycle: "monthly", nextBillingDate: "2026-08-05", diffDays: 3 },
    { name: "Adobe CC", icon: "🎨", cost: 1675.84, billingCycle: "yearly",  nextBillingDate: "2026-08-05", diffDays: 3 },
  ];

  const body = wrap(`
    ${header(`<span class="font-sans txt-white" style="font-size:9px;font-weight:700;background-color:#b45309;background-image:linear-gradient(#b45309,#b45309);padding:4px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Alert</span>`)}
    <tr><td align="left">
      <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">Upcoming Subscription Renewals</h1>
      <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Heads up! The following subscriptions are renewing in the next 2–3 days.</p>
    </td></tr>

    <tr><td>
      ${renewals.map(sub => `
      <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:2px solid #b45309;margin-bottom:16px;">
        <tr><td style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" valign="middle">
              <table cellpadding="0" cellspacing="0"><tr>
                <td align="center" valign="middle" style="font-size:24px;width:44px;height:44px;background-color:#eae8e0;border-radius:8px;">${sub.icon}</td>
                <td valign="middle" style="padding-left:16px;">
                  <div class="font-sans txt-main" style="font-size:15px;font-weight:600;line-height:1.2;">${sub.name}</div>
                  <div class="font-mono txt-warn" style="font-size:9px;font-weight:700;background-color:#fef3c7!important;background-image:linear-gradient(#fef3c7,#fef3c7)!important;padding:3px 6px;border-radius:4px;margin-top:6px;display:inline-block;">RENEWING IN ${sub.diffDays} DAYS</div>
                </td>
              </tr></table>
            </td>
            <td align="right" valign="middle">
              <div class="font-sans txt-main" style="font-size:18px;font-weight:700;">₹${sub.cost.toFixed(2)}</div>
              <div class="font-sans txt-muted" style="font-size:11px;margin-top:4px;">${sub.billingCycle === "yearly" ? "Yearly" : "Monthly"} · ${sub.nextBillingDate}</div>
            </td>
          </tr></table>
        </td></tr>
      </table>`).join("")}
    </td></tr>
    ${footer("Manage Subscriptions", "Automated security alert from your dashboard.", appUrl)}
  `);

  return { html: htmlDoc("Upcoming Renewals", body), subject: `[PREVIEW] Upcoming Subscription Renewals — ${todayStr}` };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const type: string = body.type || "portfolio";
    const TO_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" });

    let emailHtml: string;
    let subject: string;

    switch (type) {
      case "portfolio": {
        const r = buildPortfolioEmail(appUrl, todayStr);
        emailHtml = r.html; subject = r.subject; break;
      }
      case "expenses_weekly": {
        const r = buildExpensesEmail("weekly", appUrl, todayStr);
        emailHtml = r.html; subject = r.subject; break;
      }
      case "expenses_monthly": {
        const r = buildExpensesEmail("monthly", appUrl, todayStr);
        emailHtml = r.html; subject = r.subject; break;
      }
      case "subscriptions": {
        const r = buildSubscriptionsEmail(appUrl, todayStr);
        emailHtml = r.html; subject = r.subject; break;
      }
      default:
        return NextResponse.json({ error: `Unknown preview type: ${type}` }, { status: 400 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CRON_SENDER_EMAIL || "Continuum Home <onboarding@resend.dev>",
        to: [TO_EMAIL],
        subject,
        html: emailHtml,
      }),
    });

    if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);

    return NextResponse.json({ success: true, sentTo: TO_EMAIL, type });
  } catch (err: any) {
    console.error("Preview email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
