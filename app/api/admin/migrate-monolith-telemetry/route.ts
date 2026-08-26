import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listAllUsers,
  adminListExpenses,
  adminListSubscriptions,
  adminListWatchlist,
  adminGetPortfolio,
  getAdminDb,
} from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

const MONOLITH_ENDPOINT = process.env.MONOLITH_API_URL
  ? `${process.env.MONOLITH_API_URL.replace(/\/$/, "")}/api/v1/events/postback`
  : "https://api.adithyakrishnan.com/api/v1/events/postback";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

    if (!session.user.email || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const apiKey = process.env.MONOLITH_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MONOLITH_API_KEY environment variable is not configured." }, { status: 500 });
    }

    const users = await listAllUsers();

    let expensesEmitted = 0;
    let subscriptionsEmitted = 0;
    let watchlistEmitted = 0;
    let investmentsEmitted = 0;
    let salaryEventsEmitted = 0;
    const errors: string[] = [];

    const sendEvent = async (eventType: string, userId: string, entityId?: string, payload?: Record<string, any>) => {
      try {
        const res = await fetch(MONOLITH_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            sourceApp: "continuum-home",
            eventId: crypto.randomUUID(),
            eventType,
            userId,
            entityId,
            itemCount: 1,
            timestamp: Date.now(),
            payload: { ...(payload || {}), environment: "production" },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`Failed ${eventType} for ${entityId}: ${res.status} ${errText}`);
        }
      } catch (err: any) {
        errors.push(`Network error ${eventType}: ${err.message}`);
      }
    };

    for (const user of users) {
      // 1. Migrate Expenses
      try {
        const expenses = await adminListExpenses(user.uid);
        for (const exp of expenses) {
          await sendEvent("EXPENSE_CREATED", user.uid, exp.id, {
            amount: exp.amount,
            category: exp.category,
            date: exp.date,
          });
          expensesEmitted++;
        }
      } catch (err: any) {
        errors.push(`Expenses for uid ${user.uid}: ${err.message}`);
      }

      // 2. Migrate Subscriptions
      try {
        const subscriptions = await adminListSubscriptions(user.uid);
        for (const sub of subscriptions) {
          await sendEvent("SUBSCRIPTION_CREATED", user.uid, sub.id, {
            name: sub.name,
            cost: sub.cost,
            billingCycle: sub.billingCycle,
          });
          subscriptionsEmitted++;
        }
      } catch (err: any) {
        errors.push(`Subscriptions for uid ${user.uid}: ${err.message}`);
      }

      // 3. Migrate Watchlist
      try {
        const watchlist = await adminListWatchlist(user.uid);
        for (const item of watchlist) {
          await sendEvent("WATCHLIST_ADDED", user.uid, item.id, {
            type: item.type,
            year: item.year,
            status: item.status,
          });
          watchlistEmitted++;
        }
      } catch (err: any) {
        errors.push(`Watchlist for uid ${user.uid}: ${err.message}`);
      }

      // 4. Migrate Investments/Portfolio
      try {
        const portfolio = await adminGetPortfolio(user.uid);
        if (portfolio && portfolio.assets) {
          for (const asset of portfolio.assets) {
            await sendEvent("INVESTMENT_CREATED", user.uid, asset.id, {
              name: asset.name,
              category: asset.category,
              amount: asset.amount,
              investedAmount: asset.investedAmount,
            });
            investmentsEmitted++;
          }
        }
      } catch (err: any) {
        errors.push(`Portfolio for uid ${user.uid}: ${err.message}`);
      }

      // 5. Migrate Settings & Salary Updates
      try {
        const settingsDoc = await getAdminDb().collection("settings").doc(user.uid).get();
        if (settingsDoc.exists) {
          const settingsData = settingsDoc.data() || {};
          if (settingsData.monthlySalary !== undefined || settingsData.salaryDay !== undefined) {
            await sendEvent("SALARY_UPDATED", user.uid, `salary_${user.uid}`, {
              monthlySalary: settingsData.monthlySalary,
              salaryDay: settingsData.salaryDay,
            });
            salaryEventsEmitted++;
          }
          if (settingsData.salaryLog && typeof settingsData.salaryLog === "object") {
            await sendEvent("SALARY_LOGGED", user.uid, `salary_log_${user.uid}`, {
              entriesCount: Object.keys(settingsData.salaryLog).length,
            });
            salaryEventsEmitted++;
          }
        }
      } catch (err: any) {
        errors.push(`Settings for uid ${user.uid}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      migrated: {
        expensesEmitted,
        subscriptionsEmitted,
        watchlistEmitted,
        investmentsEmitted,
        salaryEventsEmitted,
        totalEvents: expensesEmitted + subscriptionsEmitted + watchlistEmitted + investmentsEmitted + salaryEventsEmitted,
      },
      errors,
    });
  } catch (error: any) {
    console.error("Monolith Migration Error:", error);
    return NextResponse.json({ error: error.message || "Migration failed" }, { status: 500 });
  }
}
