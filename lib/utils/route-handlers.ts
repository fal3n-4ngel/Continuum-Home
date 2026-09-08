
import { NextRequest, NextResponse } from "next/server";
import { requireUser, type Session } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";
import { env } from "@/lib/utils";

export type RouteContext = { params: Promise<Record<string, string>> };

type Handler = (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse>;

export function withErrors(label: string, handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return toErrorResponse(error, label);
    }
  };
}

export function withUser(
  label: string,
  handler: (req: NextRequest, session: Session, ctx?: RouteContext) => Promise<NextResponse>
): Handler {
  return withErrors(label, async (req, ctx) => {
    const session = await requireUser(req);
    return handler(req, session, ctx);
  });
}

export function withAdmin(
  label: string,
  handler: (req: NextRequest, session: Session, ctx?: RouteContext) => Promise<NextResponse>
): Handler {
  return withUser(label, async (req, session, ctx) => {
    if (session.user.email !== env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }
    return handler(req, session, ctx);
  });
}

export function withCron(
  job: string,
  handler: (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse>,
  opts: { requireResend?: boolean } = {}
): Handler {
  return withErrors(`Error in cron/${job}`, async (req, ctx) => {
    const authHeader = req.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (opts.requireResend && !env.RESEND_API_KEY) {
      const { reportCronAbort } = await import("@/lib/cron");
      reportCronAbort(job, "Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    return handler(req, ctx);
  });
}
