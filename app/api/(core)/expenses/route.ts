import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { listExpenses, createExpense, createExpenseBatch } from "@/lib/firebase";
import { validateExpenseEntry, validateExpenseBatch } from "@/lib/firebase";
import { isCustomGptRequest } from "@/lib/utils";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const expenses = await listExpenses(session, { q, category, from, to });
    return NextResponse.json(expenses);
  } catch (error) {
    return toErrorResponse(error, "GET /api/expenses");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const itemsField = (body as { items?: unknown } | null)?.items;
    const batchItems = Array.isArray(body) ? body : Array.isArray(itemsField) ? itemsField : null;

    if (batchItems) {
      const entries = validateExpenseBatch(batchItems);
      const results = await createExpenseBatch(session, entries);
      const added = results.filter((r) => r.success).length;

      if (added > 0) {
        const channel = isCustomGptRequest(req) ? "custom_gpt" : "web";
        results.forEach((r, idx) => {
          if (r.success && "id" in r && r.id) {
            const entry = entries[idx];
            if (!entry) return;
            const resolvedDate = entry.date || new Date().toISOString().slice(0, 10);
            recordDomainEvent({
              eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
              userId: session.uid,
              entityId: r.id as string,
              userEmail: session.user.email,
              itemCount: 1,
              payload: {
                title: entry.title,
                amount: entry.amount,
                category: entry.category,
                date: resolvedDate,
                channel,
                batch: true,
              },
            });
          }
        });
      }

      return NextResponse.json({ success: true, added, results });
    }

    const entry = validateExpenseEntry(body);
    const resolvedDate = entry.date || new Date().toISOString().slice(0, 10);
    const result = await createExpense(session, { ...entry, date: resolvedDate });

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
      userId: session.uid,
      entityId: result.id,
      userEmail: session.user.email,
      payload: {
        title: entry.title,
        amount: entry.amount,
        category: entry.category,
        date: resolvedDate,
        channel: isCustomGptRequest(req) ? "custom_gpt" : "web",
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "POST /api/expenses");
  }
}
