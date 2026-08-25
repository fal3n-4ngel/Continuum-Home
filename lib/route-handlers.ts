// Composable wrappers for the auth + error handling every API route repeats.
//
// Each wrapper owns one authorization model and funnels failures through
// toErrorResponse, so a route body only contains the work it actually does and
// an unhandled throw can never leak a stack trace to a caller.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { env } from "@/lib/env";
import type { Session } from "@/lib/auth";

export type RouteContext = { params: Promise<Record<string, string>> };

// ctx is optional: Next.js always supplies it, but static routes never read it
// and tests invoke handlers directly with just a request.
type Handler = (req: NextRequest, ctx?: RouteContext) => Promise<NextResponse>;

/** Wraps a handler so any throw becomes a structured error response. */
export function withErrors(label: string, handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      return toErrorResponse(error, label);
    }
  };
}

/** Requires a signed-in user and passes the resolved session to the handler. */
export function withUser(
  label: string,
  handler: (req: NextRequest, session: Session, ctx?: RouteContext) => Promise<NextResponse>
): Handler {
  return withErrors(label, async (req, ctx) => {
    const session = await requireUser(req);
    return handler(req, session, ctx);
  });
}

/** Requires the signed-in user to be the configured admin. */
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

/**
 * Requires the shared cron bearer token.
 *
 * `requireResend` exists because a cron that mails users is useless without a
 * key: it lets the route fail fast with a 500 the workflow surfaces, instead
 * of fanning out across every user and failing once per account.
 */
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
      const { reportCronAbort } = await import("@/lib/cron-alert");
      reportCronAbort(job, "Missing RESEND_API_KEY");
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    return handler(req, ctx);
  });
}
