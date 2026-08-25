import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { updateExpense, archiveExpense } from "@/lib/firebase";
import { validateExpensePatch } from "@/lib/firebase";

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

    const patch = validateExpensePatch(body);
    const result = await updateExpense(session, id, patch);
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
    const result = await archiveExpense(session, id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/expenses/[id]");
  }
}
