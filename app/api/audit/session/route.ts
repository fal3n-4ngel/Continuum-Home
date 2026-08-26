import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";
import { sendAuditPostback, AUDIT_EVENT_TYPES } from "@/lib/audit-postback";

export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    await sendAuditPostback({
      eventType: AUDIT_EVENT_TYPES.USER_SESSION_ACTIVE,
      userId: session.uid,
      metadata: { email: session.user.email, name: session.user.displayName, authProvider: "google" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "POST /api/audit/session");
  }
}
