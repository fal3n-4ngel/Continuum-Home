import { NextRequest } from "next/server";
import { sendAuditPostback } from "./client";
import { AUDIT_EVENT_TYPES } from "./types";

// Check if request originated from ChatGPT / Custom GPT
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

// Log postback if request is from a Custom GPT
export async function checkAndSendCustomGptAudit(
  req: NextRequest,
  userId: string,
  actionName: string,
  extraMetadata: Record<string, unknown> = {}
): Promise<void> {
  if (!isCustomGptRequest(req)) return;

  const userAgent = req.headers.get("user-agent") || "ChatGPT-User/1.0";
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

  sendAuditPostback({
    eventType: AUDIT_EVENT_TYPES.CUSTOM_GPT_ACTION,
    severity: "INFO",
    userId,
    metadata: {
      action: actionName,
      endpoint: req.nextUrl.pathname,
      method: req.method,
      gptUserAgent: userAgent,
      ...extraMetadata,
    },
    context: {
      clientIp,
      userAgent,
      isCustomGpt: true,
    },
  }).catch(() => {});
}
