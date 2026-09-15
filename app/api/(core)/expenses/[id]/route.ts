import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { updateExpense, archiveExpense, getExpense } from "@/lib/firebase";
import { validateExpensePatch } from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";
import { isCustomGptRequest } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser(req);
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const existing = await getExpense(session, id);
    const patch = validateExpensePatch(body);
    const result = await updateExpense(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_UPDATED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        fields: Object.keys(patch),
        title: patch.title ?? existing?.title,
        amount: patch.amount ?? existing?.amount,
        category: patch.category ?? existing?.category,
        date: patch.date ?? existing?.date,
        channel: isCustomGptRequest(req) ? "custom_gpt" : "web",
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/expenses/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser(req);
    const { id } = await params;
    const existing = await getExpense(session, id);
    const result = await archiveExpense(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.EXPENSE_DELETED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        ...(existing
          ? {
              title: existing.title,
              amount: existing.amount,
              category: existing.category,
              date: existing.date,
            }
          : {}),
        deletedAt: Date.now(),
        channel: isCustomGptRequest(req) ? "custom_gpt" : "web",
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/expenses/[id]");
  }
}
