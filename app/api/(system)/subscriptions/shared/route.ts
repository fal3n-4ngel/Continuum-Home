import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/utils/route-handlers";
import { ApiError } from "@/lib/utils";
import { getSubscription, assertDocId } from "@/lib/firebase";
import {
  adminSyncSharedSubscription,
  adminListSharedSubscriptions,
  adminDismissSharedSubscription,
} from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export const GET = withUser("GET /api/subscriptions/shared", async (_req, session) => {
  const shared = await adminListSharedSubscriptions(session.uid);
  return NextResponse.json(shared);
});

export const POST = withUser("POST /api/subscriptions/shared", async (req: NextRequest, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  const subscriptionId = (body as { subscriptionId?: unknown } | null)?.subscriptionId;
  if (typeof subscriptionId !== "string" || !subscriptionId.trim()) {
    throw new ApiError(400, "Field 'subscriptionId' is required.");
  }
  assertDocId(subscriptionId.trim(), "subscription");

  const sub = await getSubscription(session, subscriptionId.trim());
  const ownerEmail = session.user.email || session.uid;
  const result = await adminSyncSharedSubscription(session.uid, ownerEmail, sub, subscriptionId.trim());

  return NextResponse.json({ success: true, ...result });
});

export const DELETE = withUser("DELETE /api/subscriptions/shared", async (req: NextRequest, session) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    throw new ApiError(400, "Query parameter 'id' is required.");
  }
  assertDocId(id, "shared subscription");
  await adminDismissSharedSubscription(session.uid, id);
  return NextResponse.json({ success: true });
});
