import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getHealthAnalytics, saveHealthAnalytics, HealthAnalyticsReport } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { reserveGeminiCall, acquireGenerationLock, isGeminiQuotaError } from "@/lib/integrations";

export const dynamic = "force-dynamic";

function computeFingerprint(metrics: {
  startStr?: string;
  spentSoFar?: number;
  projectedTotalSpend?: number;
  prevCycleSpend?: number;
  cycleCatBreakdown?: Record<string, number>;
}): string {
  const sStr = metrics.startStr || "cycle";
  const spent = metrics.spentSoFar ?? 0;
  const proj = metrics.projectedTotalSpend ?? 0;
  const prev = metrics.prevCycleSpend ?? 0;
  const cats = JSON.stringify(metrics.cycleCatBreakdown || {});
  return `${sStr}_spent:${spent}_proj:${proj}_prev:${prev}_cats:${cats}`;
}

function buildRuleBasedSpendReport(metrics: {
  startStr: string;
  spentSoFar: number;
  projectedTotalSpend: number;
  prevCycleSpend: number;
  prevCycleSpendToSameDay: number;
  paceDeltaPct: number | null;
  cycleCatBreakdown: Record<string, number>;
  totalIncome: number;
  targetSavings: number;
  currency: string;
  fingerprint: string;
}): HealthAnalyticsReport {
  const {
    spentSoFar,
    projectedTotalSpend,
    prevCycleSpendToSameDay,
    paceDeltaPct,
    cycleCatBreakdown,
    totalIncome,
    targetSavings,
    currency,
    fingerprint,
  } = metrics;

  const catEntries = Object.entries(cycleCatBreakdown || {}).sort((a, b) => b[1] - a[1]);
  const totalCatSpend = catEntries.reduce((sum, [, amt]) => sum + amt, 0) || spentSoFar || 1;

  const topCategories = catEntries.slice(0, 4).map(([category, amount]) => ({
    category,
    amount,
    percentage: Math.round((amount / totalCatSpend) * 100),
  }));

  let trendStatus = "On Track (Balanced Pace)";
  let trendSeverity: "good" | "neutral" | "warning" = "good";

  if (paceDeltaPct != null) {
    if (paceDeltaPct > 15) {
      trendStatus = `+${paceDeltaPct.toFixed(1)}% vs last cycle (Faster Pace)`;
      trendSeverity = "warning";
    } else if (paceDeltaPct > 0) {
      trendStatus = `+${paceDeltaPct.toFixed(1)}% vs last cycle (Slight Rise)`;
      trendSeverity = "neutral";
    } else {
      trendStatus = `${paceDeltaPct.toFixed(1)}% vs last cycle (Slower Pace)`;
      trendSeverity = "good";
    }
  }

  const spendTrends: string[] = [];
  if (topCategories.length > 0) {
    const top = topCategories[0];
    spendTrends.push(`${top.category} is your highest spend category at ${currency}${top.amount.toLocaleString("en-IN")} (${top.percentage}% of total).`);
  }
  if (prevCycleSpendToSameDay > 0) {
    const diff = spentSoFar - prevCycleSpendToSameDay;
    if (diff > 0) {
      spendTrends.push(`Spent ${currency}${Math.round(diff).toLocaleString("en-IN")} more than the same day in the previous cycle.`);
    } else if (diff < 0) {
      spendTrends.push(`Saved ${currency}${Math.round(Math.abs(diff)).toLocaleString("en-IN")} compared to the same day in the previous cycle.`);
    }
  }

  const anomalies: string[] = [];
  if (topCategories.length > 0 && topCategories[0].percentage > 45) {
    anomalies.push(`High concentration: ${topCategories[0].category} accounts for over ${topCategories[0].percentage}% of total monthly spend.`);
  }

  const savingOpportunities: string[] = [];
  if (topCategories.length > 1) {
    savingOpportunities.push(`Look for monthly optimization in your top categories: ${topCategories.slice(0, 2).map((c) => c.category).join(" and ")}.`);
  }
  if (targetSavings > 0) {
    savingOpportunities.push(`Set aside your monthly target savings of ${currency}${targetSavings.toLocaleString("en-IN")} at payday.`);
  }

  const safeSpendAdvice =
    totalIncome > 0 && spentSoFar < totalIncome
      ? `Maintain current spend velocity to stay under budget.`
      : `Pace discretionary category spend carefully to avoid monthly deficit.`;

  return {
    trendStatus,
    trendSeverity,
    executiveSummary: `Total spent so far is ${currency}${spentSoFar.toLocaleString("en-IN")}, with projected cycle total of ${currency}${projectedTotalSpend.toLocaleString("en-IN")}. ${
      topCategories.length > 0 ? `Primary driver: ${topCategories[0].category} (${topCategories[0].percentage}%).` : ""
    }`,
    topCategories,
    spendTrends,
    anomalies,
    savingOpportunities,
    safeSpendAdvice,
    fingerprint,
    updatedAt: Date.now(),
  };
}

async function handleHealthAnalytics(req: NextRequest, isForceRefresh: boolean) {
  try {
    const session = await requireUser(req);

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
      }
    }

    const searchParams = req.nextUrl.searchParams;
    const startStr = body.startStr || searchParams.get("startStr") || "";
    const spentSoFar = Number(body.spentSoFar ?? searchParams.get("spentSoFar") ?? 0);
    const projectedTotalSpend = Number(body.projectedTotalSpend ?? searchParams.get("projectedTotalSpend") ?? 0);
    const prevCycleSpend = Number(body.prevCycleSpend ?? searchParams.get("prevCycleSpend") ?? 0);
    const prevCycleSpendToSameDay = Number(body.prevCycleSpendToSameDay ?? searchParams.get("prevCycleSpendToSameDay") ?? 0);
    const paceDeltaPctRaw = body.paceDeltaPct ?? searchParams.get("paceDeltaPct");
    const paceDeltaPct = paceDeltaPctRaw != null ? Number(paceDeltaPctRaw) : null;
    const totalIncome = Number(body.totalIncome ?? searchParams.get("totalIncome") ?? 0);
    const targetSavings = Number(body.targetSavings ?? searchParams.get("targetSavings") ?? 0);
    const currency = body.currency || searchParams.get("currency") || "₹";

    let cycleCatBreakdown: Record<string, number> = {};
    if (body.cycleCatBreakdown) {
      cycleCatBreakdown = body.cycleCatBreakdown;
    } else {
      const rawCat = searchParams.get("cycleCatBreakdown");
      if (rawCat) {
        try {
          cycleCatBreakdown = JSON.parse(rawCat);
        } catch {
        }
      }
    }

    const fingerprint = computeFingerprint({
      startStr,
      spentSoFar,
      projectedTotalSpend,
      prevCycleSpend,
      cycleCatBreakdown,
    });

    const cachedReport = await getHealthAnalytics(session);

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (
      !isForceRefresh &&
      cachedReport &&
      cachedReport.fingerprint === fingerprint &&
      Date.now() - (cachedReport.updatedAt || 0) < TWENTY_FOUR_HOURS
    ) {
      return NextResponse.json({ report: cachedReport, cached: true, updated: false });
    }

    const fallbackReport = buildRuleBasedSpendReport({
      startStr,
      spentSoFar,
      projectedTotalSpend,
      prevCycleSpend,
      prevCycleSpendToSameDay,
      paceDeltaPct,
      cycleCatBreakdown,
      totalIncome,
      targetSavings,
      currency,
      fingerprint,
    });

    const lockKey = startStr || "current_cycle";
    const gotLock = await acquireGenerationLock(session.uid, "spend_analytics", lockKey);
    if (!gotLock) {
      const rep = cachedReport || fallbackReport;
      return NextResponse.json({ report: rep, cached: true, updated: false, busy: true });
    }

    const withinBudget = await reserveGeminiCall();
    if (!withinBudget) {
      const rep = cachedReport || fallbackReport;
      if (!cachedReport) await saveHealthAnalytics(session, fallbackReport);
      return NextResponse.json({ report: rep, cached: true, updated: false, budgetExceeded: true });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      const rep = cachedReport || fallbackReport;
      if (!cachedReport) await saveHealthAnalytics(session, fallbackReport);
      return NextResponse.json({ report: rep, cached: true, updated: false });
    }

    const prompt = `
You are an expert AI Expense Trend & Category Analyst for a personal dashboard.
Analyze the user's monthly spending data and trends for the current pay cycle:
- Currency Symbol: ${currency}
- Total Monthly Income: ${currency}${totalIncome.toLocaleString("en-IN")}
- Spent So Far This Cycle: ${currency}${spentSoFar.toLocaleString("en-IN")}
- Projected Total Cycle Spend: ${currency}${projectedTotalSpend.toLocaleString("en-IN")}
- Previous Cycle Total Spend: ${currency}${prevCycleSpend.toLocaleString("en-IN")}
- Previous Cycle Spend to Same Day: ${currency}${prevCycleSpendToSameDay.toLocaleString("en-IN")}
- Pace Delta vs Last Cycle: ${paceDeltaPct != null ? `${paceDeltaPct > 0 ? "+" : ""}${paceDeltaPct.toFixed(1)}%` : "N/A"}
- Category Breakdown This Cycle: ${JSON.stringify(cycleCatBreakdown)}
- Target Monthly Savings Goal: ${currency}${targetSavings.toLocaleString("en-IN")}

Analyze their monthly spending patterns, category distribution, spending velocity, anomalies, and pace shifts.
CRITICAL CONSTRAINT: DO NOT include markdown formatting like asterisks (**) or hashes (#) in any of the string fields. Return plain text only.
Return ONLY a valid JSON object with these exact keys:
- "trendStatus": A short 3-5 word trend summary (e.g., "+12.4% vs last cycle (Faster Pace)" or "On Track (-5.2% vs last cycle)").
- "trendSeverity": One of "good", "neutral", or "warning".
- "executiveSummary": A 2-3 sentence overview of their monthly spending velocity and category breakdown.
- "topCategories": An array of objects with keys {"category": string, "amount": number, "percentage": number} for the top 3-4 spending categories.
- "spendTrends": An array of 2-3 specific bullet points highlighting monthly spending pattern shifts or category changes.
- "anomalies": An array of 1-2 specific spending anomalies or category spikes to watch out for.
- "savingOpportunities": An array of 2-3 actionable, high-impact ways to cut unnecessary monthly expenses.
- "safeSpendAdvice": A short 1-2 sentence recommendation on daily/weekly discretionary spending limits.

Return no markdown backticks, no comments, and no text outside the JSON object.
`;

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let replyText: string;
    try {
      const response = await model.generateContent(prompt);
      replyText = response.response.text();
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        const rep = cachedReport || fallbackReport;
        if (!cachedReport) await saveHealthAnalytics(session, fallbackReport);
        return NextResponse.json({ report: rep, cached: true, updated: false, budgetExceeded: true });
      }
      throw err;
    }

    const geminiData = JSON.parse(replyText.trim());

    const severity: "good" | "neutral" | "warning" =
      geminiData.trendSeverity === "warning" || geminiData.trendSeverity === "good" ? geminiData.trendSeverity : "neutral";

    const newReport: HealthAnalyticsReport = {
      trendStatus: String(geminiData.trendStatus || fallbackReport.trendStatus),
      trendSeverity: severity,
      executiveSummary: String(geminiData.executiveSummary || fallbackReport.executiveSummary),
      topCategories: Array.isArray(geminiData.topCategories) ? geminiData.topCategories : fallbackReport.topCategories,
      spendTrends: Array.isArray(geminiData.spendTrends) ? geminiData.spendTrends.map(String) : fallbackReport.spendTrends,
      anomalies: Array.isArray(geminiData.anomalies) ? geminiData.anomalies.map(String) : fallbackReport.anomalies,
      savingOpportunities: Array.isArray(geminiData.savingOpportunities) ? geminiData.savingOpportunities.map(String) : fallbackReport.savingOpportunities,
      safeSpendAdvice: String(geminiData.safeSpendAdvice || fallbackReport.safeSpendAdvice),
      fingerprint,
      updatedAt: Date.now(),
    };

    await saveHealthAnalytics(session, newReport);

    return NextResponse.json({ report: newReport, cached: false, updated: true });
  } catch (error) {
    return toErrorResponse(error, "GET/POST /api/assistant/health-analytics");
  }
}

export async function GET(req: NextRequest) {
  return handleHealthAnalytics(req, false);
}

export async function POST(req: NextRequest) {
  const forceParam = req.nextUrl.searchParams.get("force");
  return handleHealthAnalytics(req, forceParam === "true" || forceParam === "1");
}
