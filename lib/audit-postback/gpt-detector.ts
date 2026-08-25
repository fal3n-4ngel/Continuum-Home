import { after, NextRequest } from "next/server";
import { sendAuditPostback } from "./client";
import { AUDIT_EVENT_TYPES } from "./types";

/** Check whether a request originated from ChatGPT / a Custom GPT action. */
export function isCustomGptRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get("user-agent") || "";
  const clientHeader = req.headers.get("x-client") || "";
  return (
    userAgent.includes("ChatGPT-User") ||
    userAgent.includes("OpenAI-GPT") ||
    clientHeader.includes("gpt") ||
    clientHeader.includes("custom-gpt")
  );
}

/**
 * Log a postback if the request came from a Custom GPT.
 */
export function checkAndSendCustomGptAudit(
  req: NextRequest,
  userId: string,
  actionName: string,
  extraMetadata: Record<string, unknown> = {}
): void {
  if (!isCustomGptRequest(req)) return;

  const userAgent = req.headers.get("user-agent") || "ChatGPT-User/1.0";
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || undefined;
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  after(() =>
    sendAuditPostback({
      eventType: AUDIT_EVENT_TYPES.CUSTOM_GPT_ACTION,
      severity: "INFO",
      userId,
      metadata: {
        action: actionName,
        endpoint: pathname,
        method,
        ...extraMetadata,
      },
      context: {
        isCustomGpt: true,
        clientIp,
        gptUserAgent: userAgent,
      },
    })
  );
}
