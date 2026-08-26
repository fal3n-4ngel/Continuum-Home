import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { deleteSubscription, updateSubscription } from "@/lib/firebase";
import { validateSubscriptionPatch } from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireUser(req);
    await deleteSubscription(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.SUBSCRIPTION_DELETED,
      userId: session.uid,
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/subscriptions/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const patch = validateSubscriptionPatch(body);
    await updateSubscription(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.SUBSCRIPTION_UPDATED,
      userId: session.uid,
      entityId: id,
      payload: { fields: Object.keys(patch), cost: patch.cost },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/subscriptions/[id]");
  }
}
