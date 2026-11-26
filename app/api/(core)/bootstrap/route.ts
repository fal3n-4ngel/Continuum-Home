import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";
import {
  listExpenses,
  listWatchlist,
  listSubscriptions,
  getPortfolio,
  getSettings,
  updateSettings,
} from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);

    const [expenses, watchlist, subscriptions, portfolio, existingSettings] = await Promise.all([
      listExpenses(session),
      listWatchlist(session),
      listSubscriptions(session),
      getPortfolio(session),
      getSettings(session),
    ]);

    let settings = existingSettings;
    if (!settings) {
      const initialSettings = {
        timeFilter: "all" as const,
        salaryDay: 1,
        monthlySalary: 0,
        additionalIncome: 0,
        currency: "₹",
        reconciliations: {},
        salaryLog: {},
        aiOptOut: false,
        emailSubscriptions: { expenses: true, portfolio: false, subscriptions: true },
      };
      await updateSettings(session, initialSettings);
      settings = await getSettings(session);
    }

    return NextResponse.json({
      expenses,
      watchlist,
      subscriptions,
      portfolio: portfolio || { assets: [] },
      settings: settings || { timeFilter: "all", salaryDay: 1 },
    });
  } catch (error) {
    return toErrorResponse(error, "GET /api/bootstrap");
  }
}
