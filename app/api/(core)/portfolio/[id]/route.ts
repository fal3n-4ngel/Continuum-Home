import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { deletePortfolioAsset, updatePortfolioAsset, getPortfolioAsset } from "@/lib/firebase";
import { validatePortfolioAssetPatch } from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

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

    const existing = await getPortfolioAsset(session, id);
    const patch = validatePortfolioAssetPatch(body);
    const result = await updatePortfolioAsset(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.INVESTMENT_UPDATED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        fields: Object.keys(patch),
        name: patch.name ?? existing?.name,
        category: patch.category ?? existing?.category,
        amount: patch.amount !== undefined ? patch.amount : existing?.amount,
        investedAmount: patch.investedAmount !== undefined ? patch.investedAmount : existing?.investedAmount,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/portfolio/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser(req);
    const { id } = await params;
    const existing = await getPortfolioAsset(session, id);
    const result = await deletePortfolioAsset(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.INVESTMENT_DELETED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        ...(existing
          ? {
              name: existing.name,
              category: existing.category,
              amount: existing.amount,
              investedAmount: existing.investedAmount,
            }
          : {}),
        deletedAt: Date.now(),
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/portfolio/[id]");
  }
}
