import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import {
  savePushSubscription,
  removePushSubscription,
  getUserPushSubscriptions,
} from "@/lib/firebase";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push/web-push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const publicKey = getVapidPublicKey();
    const isConfigured = isPushConfigured();
    const existing = await getUserPushSubscriptions(session.uid);

    return NextResponse.json({
      vapidPublicKey: publicKey,
      isConfigured,
      hasActiveSubscription: existing.length > 0,
      subscriptionCount: existing.length,
    });
  } catch (error) {
    return toErrorResponse(error, "GET /api/push");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();

    if (!body || !body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      throw new ApiError(400, "Invalid push subscription object.");
    }

    const userAgent = req.headers.get("user-agent") || "";
    const saved = await savePushSubscription(session, body.subscription, userAgent);

    return NextResponse.json({ success: true, subscription: saved });
  } catch (error) {
    return toErrorResponse(error, "POST /api/push");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();

    if (!body?.endpoint) {
      throw new ApiError(400, "Subscription endpoint is required to unsubscribe.");
    }

    await removePushSubscription(session, body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/push");
  }
}
