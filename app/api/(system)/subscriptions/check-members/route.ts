import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/utils/route-handlers";
import { ApiError } from "@/lib/utils";
import { adminFindUsersByEmails } from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

const MAX_EMAILS = 25;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST = withUser("POST /api/subscriptions/check-members", async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  const rawEmails = (body as { emails?: unknown } | null)?.emails;
  if (!Array.isArray(rawEmails)) {
    throw new ApiError(400, "Field 'emails' must be an array.");
  }

  const normalized = Array.from(
    new Set(
      rawEmails
        .filter((e): e is string => typeof e === "string")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => EMAIL_RE.test(e))
    )
  ).slice(0, MAX_EMAILS);

  if (normalized.length === 0) {
    return NextResponse.json({ registeredEmails: [] });
  }

  const found = await adminFindUsersByEmails(normalized);
  return NextResponse.json({
    registeredEmails: Array.from(found.keys()),
  });
});
