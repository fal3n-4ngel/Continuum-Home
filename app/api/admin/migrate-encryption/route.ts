import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listAllUsers,
  adminListExpenses,
  adminReEncryptExpense,
  adminGetPortfolio,
  adminUpdatePortfolioAssets,
  adminUpdatePortfolioValuationHistory,
} from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

    if (!session.user.email || session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const users = await listAllUsers();

    let expensesMigrated = 0;
    let expensesSkipped = 0;
    let portfoliosMigrated = 0;
    let portfoliosSkipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const expenses = await adminListExpenses(user.uid);
        for (const exp of expenses) {
          try {
            await adminReEncryptExpense(user.uid, exp.id, {
              title: exp.title,
              amount: exp.amount,
              category: exp.category,
              notes: exp.notes,
            });
            expensesMigrated++;
          } catch (err: any) {
            expensesSkipped++;
            errors.push(`expense ${exp.id} (uid ${user.uid}): ${err.message || "Unknown error"}`);
          }
        }
      } catch (err: any) {
        errors.push(`expenses list for uid ${user.uid}: ${err.message || "Unknown error"}`);
      }

      try {
        const portfolio = await adminGetPortfolio(user.uid);
        const valuationHistory = portfolio?.valuationHistory || {};
        if (portfolio && (portfolio.assets.length > 0 || Object.keys(valuationHistory).length > 0)) {
          if (portfolio.assets.length > 0) await adminUpdatePortfolioAssets(user.uid, portfolio.assets);
          if (Object.keys(valuationHistory).length > 0) {
            await adminUpdatePortfolioValuationHistory(user.uid, valuationHistory);
          }
          portfoliosMigrated++;
        }
      } catch (err: any) {
        portfoliosSkipped++;
        errors.push(`portfolio for uid ${user.uid}: ${err.message || "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      expensesMigrated,
      expensesSkipped,
      portfoliosMigrated,
      portfoliosSkipped,
      errors,
    });
  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message || "Migration failed" }, { status: 500 });
  }
}
