import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/utils/route-handlers";
import { ApiError } from "@/lib/utils";
import { assertDocId, getSubscription } from "@/lib/firebase";
import { adminSetFamilyMemberPaidStatus } from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export const POST = withUser("POST /api/subscriptions/shared/pay", async (req: NextRequest, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  const b = (body || {}) as Record<string, unknown>;
  const mode = b.mode === "owner" ? "owner" : b.mode === "member" ? "member" : null;
  if (!mode) {
    throw new ApiError(400, "Field 'mode' must be 'owner' or 'member'.");
  }

  const subscriptionId = typeof b.subscriptionId === "string" ? b.subscriptionId.trim() : "";
  if (!subscriptionId) {
    throw new ApiError(400, "Field 'subscriptionId' is required.");
  }
  assertDocId(subscriptionId, "subscription");
  const paid = typeof b.paid === "boolean" ? b.paid : true;

  if (mode === "owner") {
    const memberEmail = typeof b.memberEmail === "string" ? b.memberEmail.trim().toLowerCase() : "";
    if (!memberEmail) {
      throw new ApiError(400, "Field 'memberEmail' is required in owner mode.");
    }
    const owned = await getSubscription(session, subscriptionId);
    if (!owned) {
      throw new ApiError(404, "Subscription not found.");
    }
    const result = await adminSetFamilyMemberPaidStatus({
      ownerUid: session.uid,
      ownerEmail: session.user.email || session.uid,
      subscriptionId,
      memberEmail,
      paid,
      actor: "owner",
    });
    return NextResponse.json({ success: true, ...result });
  }

  const ownerUid = typeof b.ownerUid === "string" ? b.ownerUid.trim() : "";
  if (!ownerUid) {
    throw new ApiError(400, "Field 'ownerUid' is required in member mode.");
  }
  assertDocId(ownerUid, "ownerUid");

  const memberEmail = session.user.email?.trim().toLowerCase();
  if (!memberEmail) {
    throw new ApiError(400, "Authenticated user email is required.");
  }

  const result = await adminSetFamilyMemberPaidStatus({
    ownerUid,
    ownerEmail: ownerUid,
    subscriptionId,
    memberEmail,
    paid,
    actor: "member",
  });
  return NextResponse.json({ success: true, ...result });
});
