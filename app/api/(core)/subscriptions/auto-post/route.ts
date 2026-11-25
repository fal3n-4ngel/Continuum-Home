import { NextResponse } from "next/server";
import { withUser } from "@/lib/utils/route-handlers";
import { autoPostDueSubscriptions } from "@/lib/finance";

export const dynamic = "force-dynamic";

export const POST = withUser("POST /api/subscriptions/auto-post", async (_req, session) => {
  const result = await autoPostDueSubscriptions(session);
  return NextResponse.json({ success: true, ...result });
});
