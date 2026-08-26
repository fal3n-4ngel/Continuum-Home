import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { listExpenses, createExpense, createExpenseBatch } from "@/lib/firebase";
import { validateExpenseEntry, validateExpenseBatch } from "@/lib/firebase";
import { checkAndSendCustomGptAudit } from "@/lib/audit-postback/gpt-detector";
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

    // Batch payloads: { items: [...] } or a raw array
    const itemsField = (body as { items?: unknown } | null)?.items;
    const batchItems = Array.isArray(body) ? body : Array.isArray(itemsField) ? itemsField : null;

    if (batchItems) {
      const entries = validateExpenseBatch(batchItems);
      const results = await createExpenseBatch(session, entries);
      const added = results.filter((r) => r.success).length;

      // One event for the whole batch, not one per row.
      if (added > 0) {
        recordDomainEvent({
          eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
          userId: session.uid,
          itemCount: added,
          payload: { batch: true, submitted: entries.length },
        });
      }

      return NextResponse.json({ success: true, added, results });
    }

    const entry = validateExpenseEntry(body);
    const result = await createExpense(session, entry);

    // Audit postback ONLY if request originated from a Custom GPT / ChatGPT Action
    checkAndSendCustomGptAudit(req, session.uid, "CREATE_EXPENSE", {
      expenseId: result.id,
      amount: entry.amount,
      category: entry.category,
    });

    // Structured fields only — title/notes are free-text and stay in Firestore, encrypted.
    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
      userId: session.uid,
      entityId: result.id,
      payload: { amount: entry.amount, category: entry.category, date: entry.date },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "POST /api/expenses");
  }
}
