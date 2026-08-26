import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { listSubscriptions, createSubscription } from "@/lib/firebase";
import { validateSubscriptionEntry } from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const subscriptions = await listSubscriptions(session);
    return NextResponse.json(subscriptions);
  } catch (error) {
    return toErrorResponse(error, "GET /api/subscriptions");
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

    const entry = validateSubscriptionEntry(body);
    const result = await createSubscription(session, entry);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.SUBSCRIPTION_CREATED,
      userId: session.uid,
      entityId: result.id,
      payload: { cost: entry.cost, billingCycle: entry.billingCycle },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "POST /api/subscriptions");
  }
}
