import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { deletePortfolioAsset, updatePortfolioAsset } from "@/lib/firebase";
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

    const patch = validatePortfolioAssetPatch(body);
    const result = await updatePortfolioAsset(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.INVESTMENT_UPDATED,
      userId: session.uid,
      entityId: id,
      payload: { fields: Object.keys(patch) },
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
    const result = await deletePortfolioAsset(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.INVESTMENT_DELETED,
      userId: session.uid,
      entityId: id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/portfolio/[id]");
  }
}
