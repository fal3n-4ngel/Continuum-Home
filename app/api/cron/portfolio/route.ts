import { NextRequest, NextResponse } from "next/server";
import { listAllUsers, adminGetPortfolio, adminUpdatePortfolioValuationHistory, adminGetEmailSubscriptions, type AdminUser } from "@/lib/firebase/firebase-admin";
import { createPriceFetcher, getUsdToInrRate, type PriceFetcher } from "@/lib/finance";
import { getEffectiveAmount } from "@/lib/finance";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron";
import { getIstDateString } from "@/lib/utils";
import { reportCronFailures, type CronUserResult } from "@/lib/cron";
import { withCron } from "@/lib/utils/route-handlers";
import { buildUnsubscribeUrl } from "@/lib/auth";
import { buildPortfolioEmail } from "@/emails/templates/portfolio";
import { env, resolveEmailRecipient } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProcessResult = { sent: false; reason: string } | { sent: true; valuation: number; pnl: number };

async function processUser(
  user: AdminUser,
  usdToInr: number,
  resendApiKey: string,
  fetchPrice: PriceFetcher,
  force: boolean = false
): Promise<ProcessResult> {
  const portfolio = await adminGetPortfolio(user.uid);
  if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
    return { sent: false, reason: "empty portfolio" };
  }

  let totalInvested = 0;
  let totalCurrent = 0;

  const activeAssets = portfolio.assets.filter((asset) => !asset.isSold);
  if (activeAssets.length === 0) {
    return { sent: false, reason: "no active holdings (all assets sold)" };
  }

  const enrichedAssets = await Promise.all(
    activeAssets.map(async (asset) => {
      const category = asset.category || "equity";
      const name = asset.name || "";

      let currentPrice = asset.currentPrice || asset.buyPrice || 0;
      let isLive = false;

      const priceInfo = await fetchPrice(category, name, usdToInr, asset.mfSchemeCode);
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
      } else if (category === "sip") {
        // SIP's "quantity" field records the recurring installment amount,
        // not units held — multiplying it by NAV would be nonsense. SIP
        // valuation stays whatever the user last entered as Total Valuation.
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

  const todayDateStr = getIstDateString();

  if (!force) {
    const alreadySent = await hasCronBeenSentToday("portfolio", user.uid, todayDateStr);
    if (alreadySent) {
      return { sent: false, reason: "portfolio email already sent today (deduplicated)" };
    }
  }
  const emailPrefs = await adminGetEmailSubscriptions(user.uid);
  if (!emailPrefs.portfolio) {
    return { sent: false, reason: "user unsubscribed from portfolio update emails" };
  }
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
  const weeklyChange = lastWeekVal !== null ? totalCurrent - lastWeekVal : 0;

  // Save today's valuation history
  valHistory[todayDateStr] = totalCurrent;
  await adminUpdatePortfolioValuationHistory(user.uid, valHistory);

  const todayStr = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
  const unsubscribeUrl = buildUnsubscribeUrl(user.uid, "portfolio");
  const { subject, html } = buildPortfolioEmail({
    todayStr,
    totalCurrent,
    totalInvested,
    overallPnl,
    overallPnlPercent,
    dailyChange,
    weeklyChange,
    holdings: enrichedAssets,
    usdToInr,
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

  await markCronAsSentToday("portfolio", user.uid, todayDateStr);

  return { sent: true, valuation: totalCurrent, pnl: overallPnl };
}

export const POST = withCron(
  "portfolio",
  async (req) => {
    const force = req.nextUrl.searchParams.get("force") === "true";
    const users = await listAllUsers();
    const usdToInr = await getUsdToInrRate();
    // Shared across the whole fan-out so overlapping holdings are fetched once.
    const fetchPrice = createPriceFetcher();

    const results: CronUserResult[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, usdToInr, env.RESEND_API_KEY, fetchPrice, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err) {
        console.error(`Error in cron/portfolio for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    reportCronFailures("portfolio", results);

    const sentCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, usersProcessed: users.length, emailsSent: sentCount, results });
  },
  { requireResend: true }
);
