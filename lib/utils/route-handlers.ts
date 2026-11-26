
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

const DEPRECATION_NOTICE =
  "Legacy Custom GPTs are deprecated and will stop working on Dec 11, 2026. Please switch to the Continuum ChatGPT MCP Plugin at /api/mcp (guide: /assistant/plugin).";

function isLegacyCustomGptRequest(req: NextRequest): boolean {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  return (
    ua.includes("openai") ||
    ua.includes("chatgpt") ||
    req.headers.has("openai-conversation-id") ||
    req.headers.has("openai-ephemeral-user-id")
  );
}

async function attachLegacyGptDeprecation(res: NextResponse): Promise<NextResponse> {
  const headers = new Headers(res.headers);
  headers.set("Deprecation", "true");
  headers.set("Sunset", "Fri, 11 Dec 2026 23:59:59 GMT");
  headers.set("Link", '</assistant/plugin>; rel="successor-version"');
  headers.set("X-Deprecation-Notice", DEPRECATION_NOTICE);

  const contentType = headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const cloned = res.clone();
      const data = await cloned.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return NextResponse.json(
          {
            ...data,
            deprecated: true,
            deprecationNotice: DEPRECATION_NOTICE,
          },
          { status: res.status, headers }
        );
      }
    } catch {
    }
  }

  return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers });
}

export function withUser(
  label: string,
  handler: (req: NextRequest, session: Session, ctx?: RouteContext) => Promise<NextResponse>
): Handler {
  return withErrors(label, async (req, ctx) => {
    const session = await requireUser(req);
    const res = await handler(req, session, ctx);
    if (isLegacyCustomGptRequest(req) && !req.nextUrl.pathname.startsWith("/api/mcp")) {
      return attachLegacyGptDeprecation(res);
    }
    return res;
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
