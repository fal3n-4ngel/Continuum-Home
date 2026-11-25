import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    return NextResponse.json(
      {
        sub: session.uid,
        email: session.user.email,
        email_verified: Boolean(session.user.email),
        name: session.user.displayName,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    const errObj = error as { status?: number; message?: string };
    if (errObj?.status === 401) {
      return NextResponse.json(
        { error: "invalid_token", error_description: errObj.message || "Unauthorized" },
        { status: 401, headers: CORS_HEADERS }
      );
    }
    const res = toErrorResponse(error, "GET /api/oauth/userinfo");
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
