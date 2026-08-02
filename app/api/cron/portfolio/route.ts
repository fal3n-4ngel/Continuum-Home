import { NextRequest, NextResponse } from "next/server";
import { listAllUsers, adminGetPortfolio, adminUpdatePortfolioValuationHistory, type AdminUser } from "@/lib/firebase-admin";
import { fetchAssetPrice, getUsdToInrRate } from "@/lib/prices";
import { getEffectiveAmount } from "@/lib/fd";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; valuation: number; pnl: number };

async function processUser(user: AdminUser, usdToInr: number, resendApiKey: string): Promise<ProcessResult> {
  const portfolio = await adminGetPortfolio(user.uid);
  if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
    return { sent: false, reason: "empty portfolio" };
  }

  let totalInvested = 0;
  let totalCurrent = 0;

  const enrichedAssets = await Promise.all(
    portfolio.assets.map(async (asset) => {
      const category = asset.category || "equity";
      const name = asset.name || "";

      let currentPrice = asset.currentPrice || asset.buyPrice || 0;
      let isLive = false;

      const priceInfo = await fetchAssetPrice(category, name, usdToInr);
      if (priceInfo) {
        currentPrice = priceInfo.priceInr;
        isLive = true;
      }

      const quantity = asset.quantity !== undefined ? asset.quantity : 1;
      const investedAmount = asset.investedAmount !== undefined ? asset.investedAmount : asset.amount;

      let currentValue = asset.amount;
      if (category === "fixed_deposit") {
        // No live price feed for FDs — value comes from compound interest
        // accrual on the principal instead.
        currentValue = getEffectiveAmount(asset);
      } else if (asset.quantity !== undefined && currentPrice > 0) {
        currentValue = quantity * currentPrice;
      } else if (isLive) {
        currentValue = currentPrice;
      }

      totalInvested += investedAmount;
      totalCurrent += currentValue;

      const pnl = currentValue - investedAmount;
      const pnlPercent = investedAmount > 0 ? (pnl / investedAmount) * 100 : 0;

      return { ...asset, quantity, currentPrice, investedAmount, currentValue, pnl, pnlPercent, isLive };
    })
  );

  const overallPnl = totalCurrent - totalInvested;
  const overallPnlPercent = totalInvested > 0 ? (overallPnl / totalInvested) * 100 : 0;

  const isGreen = overallPnl >= 0;
  const pnlColor = isGreen ? "#166534" : "#991b1b";
  const pnlBg = isGreen ? "#f0fdf4" : "#fef2f2";

  // Track valuation history for yesterday and last week comparisons
  const getIstDateString = (d: Date = new Date()) => {
    const tzDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const yyyy = tzDate.getFullYear();
    const mm = String(tzDate.getMonth() + 1).padStart(2, "0");
    const dd = String(tzDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayDateStr = getIstDateString();
  const valHistory = { ...(portfolio.valuationHistory || {}) };

  const sortedDates = Object.keys(valHistory)
    .filter((d) => d !== todayDateStr)
    .sort((a, b) => b.localeCompare(a));

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const targetYesterdayStr = getIstDateString(yesterdayDate);
  const yesterdayVal =
    valHistory[targetYesterdayStr] !== undefined ? valHistory[targetYesterdayStr] : sortedDates.length > 0 ? valHistory[sortedDates[0]] : null;

  const targetLastWeekStr = getIstDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const lastWeekVal =
    valHistory[targetLastWeekStr] !== undefined
      ? valHistory[targetLastWeekStr]
      : sortedDates.length > 0
      ? valHistory[sortedDates[Math.min(sortedDates.length - 1, 6)]]
      : null;

  const dailyChange = yesterdayVal !== null ? totalCurrent - yesterdayVal : 0;
  const dailyChangePercent = yesterdayVal ? (dailyChange / yesterdayVal) * 100 : 0;

  const weeklyChange = lastWeekVal !== null ? totalCurrent - lastWeekVal : 0;
  const weeklyChangePercent = lastWeekVal ? (weeklyChange / lastWeekVal) * 100 : 0;

  // Save today's valuation history
  valHistory[todayDateStr] = totalCurrent;
  await adminUpdatePortfolioValuationHistory(user.uid, valHistory);

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <meta charset="utf-8">
  <title>Daily Portfolio Close</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f3ec !important; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; border-spacing: 0; }
    .txt-main  { color: #1c1b18 !important; -webkit-text-fill-color: #1c1b18 !important; }
    .txt-muted { color: #7c7a72 !important; -webkit-text-fill-color: #7c7a72 !important; }
    .txt-green { color: #16a34a !important; -webkit-text-fill-color: #16a34a !important; }
    .txt-red   { color: #dc2626 !important; -webkit-text-fill-color: #dc2626 !important; }
    .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .font-serif { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .font-mono  { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bento-card {
      background-color: #fcfbfa !important;
      background-image: linear-gradient(#fcfbfa, #fcfbfa) !important;
      border: 1px solid #eae8e0; border-radius: 12px;
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
  </style>
</head>
<body class="font-sans" style="background-color:#f4f3ec;margin:0;padding:0;">
  <table width="100%" bgcolor="#f4f3ec" cellpadding="0" cellspacing="0" style="background-color:#f4f3ec;background-image:linear-gradient(#f4f3ec,#f4f3ec)!important;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:680px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="border-bottom:1px solid #eae8e0;padding-bottom:16px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td align="left" class="txt-main font-sans" style="font-size:16px;font-weight:500;">PHub Dashboard</td>
            <td align="right" class="txt-muted font-sans" style="font-size:12px;">${todayStr}</td>
          </tr></table>
        </td></tr>
        <tr><td height="32"></td></tr>

        <!-- Title -->
        <tr><td align="left">
          <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">Daily Portfolio Close</h1>
          <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">Indian Market Close Wrap-Up (5:30 PM IST)</p>
        </td></tr>

        <!-- Hero card -->
        <tr><td>
          <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:3px solid ${isGreen ? '#22c55e' : '#ef4444'};margin-bottom:16px;">
            <tr><td align="center" style="padding:24px;">
              <div class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Net Asset Valuation</div>
              <div class="font-sans txt-main" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;">₹${totalCurrent.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              <div class="font-sans ${isGreen?'txt-green':'txt-red'}" style="font-size:14px;font-weight:700;">
                ${isGreen?'▲ +':'▼ -'}₹${Math.abs(overallPnl).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})} (${overallPnlPercent.toFixed(2)}%)
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Mini stat grid -->
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
              <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Invested Capital</div>
              <div class="font-sans txt-main" style="font-size:20px;font-weight:bold;margin-top:6px;">₹${totalInvested.toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
              <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Today's P&amp;L (1D)</div>
              <div class="font-sans ${dailyChange>=0?'txt-green':'txt-red'}" style="font-size:20px;font-weight:bold;margin-top:6px;">
                ${dailyChange>=0?'▲ +':'▼ -'}₹${Math.abs(dailyChange).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </div>
            </td>
            <td width="3.5%"></td>
            <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
              <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">7-Day Change (1W)</div>
              <div class="font-sans ${weeklyChange>=0?'txt-green':'txt-red'}" style="font-size:20px;font-weight:bold;margin-top:6px;">
                ${weeklyChange>=0?'▲ +':'▼ -'}₹${Math.abs(weeklyChange).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Holdings table -->
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
              ${enrichedAssets.map((a)=>`<tr>
                <td align="left" style="padding:14px 0;border-bottom:1px solid #f4f3ec;">
                  <div class="font-sans txt-main" style="font-weight:600;font-size:12px;">${a.name}</div>
                  <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${a.category}</div>
                </td>
                <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">${a.quantity.toLocaleString('en-IN')}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;">₹${a.currentPrice.toFixed(2)}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;font-weight:600;">₹${a.currentValue.toFixed(2)}</td>
                <td align="right" class="font-mono ${a.pnl>=0?'txt-green':'txt-red'}" style="padding:14px 0;border-bottom:1px solid #f4f3ec;font-size:11px;font-weight:600;">
                  ${a.pnl>=0?'+':''}₹${a.pnl.toFixed(0)}
                  <div class="txt-muted" style="font-size:9px;font-weight:normal;margin-top:3px;">(${a.pnlPercent.toFixed(1)}%)</div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:48px 0 24px 0;border-top:1px solid #eae8e0;display:block;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn-primary font-sans">Open Personal Dashboard</a>
          <p class="font-sans txt-muted" style="font-size:11px;margin-top:16px;">
            Automated daily wrap-up from your dashboard.<br>USD to INR Rate: ₹${usdToInr.toFixed(2)}
          </p>
        </td></tr>

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
      subject: `Daily Portfolio Close: ₹${totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${overallPnlPercent >= 0 ? "+" : ""}${overallPnlPercent.toFixed(1)}%)`,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API failed: ${errText}`);
  }

  return { sent: true, valuation: totalCurrent, pnl: overallPnl };
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

    const users = await listAllUsers();
    const usdToInr = await getUsdToInrRate();

    const results: { uid: string; email: string; sent: boolean; reason?: string; error?: string }[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, usdToInr, resendApiKey);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : (outcome as any).reason });
      } catch (err: any) {
        console.error(`Error in cron/portfolio for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, usersProcessed: users.length, emailsSent: sentCount, results });
  } catch (error: any) {
    console.error("Error in cron/portfolio:", error);
    return NextResponse.json({ error: error.message || "Failed to run portfolio close cron" }, { status: 500 });
  }
}
