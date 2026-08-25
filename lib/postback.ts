import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export interface PostbackPayload {
  eventType: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  userId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  prodOnly?: boolean;
  oncePerSession?: boolean;
}

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";

// Security & Session Postback Event Types
export const AUDIT_EVENT_TYPES = {
  USER_SESSION_ACTIVE: "USER_SESSION_ACTIVE",
  USER_LOGIN: "USER_LOGIN",
  CUSTOM_GPT_ACTION: "CUSTOM_GPT_ACTION",
  SECURITY_ALERT: "SECURITY_ALERT",
} as const;

export async function sendAuditPostback(payload: PostbackPayload): Promise<void> {
  // 1. If explicitly flagged as prodOnly and we're not in production, skip dispatching
  if (payload.prodOnly && !env.IS_PRODUCTION) {
    return;
  }

  // 2. Session Throttling: If oncePerSession is requested, check sessionStorage
  if (payload.oncePerSession && typeof window !== "undefined") {
    const sessionKey = `monolith_audit_sent_${payload.eventType}`;
    if (sessionStorage.getItem(sessionKey)) {
      return; // Skip duplicate dispatch in the same browser session
    }
    sessionStorage.setItem(sessionKey, "1");
  }

  const rawUrl =
    process.env.NEXT_PUBLIC_POSTBACK_API_URL ||
    process.env.MONOLITH_API_URL ||
    DEFAULT_MONOLITH_API_URL;

  const apiKey =
    process.env.NEXT_PUBLIC_POSTBACK_API_KEY ||
    process.env.MONOLITH_API_KEY;

  if (!rawUrl) return;

  const baseUrl = rawUrl.replace(/\/$/, "");
  const targetEndpoint = baseUrl.includes("/postback")
    ? baseUrl
    : `${baseUrl}/api/v1/audit/postback`;

  try {
    const body = JSON.stringify({
      sourceApp: "continuum-home",
      eventType: payload.eventType,
      severity: payload.severity || "INFO",
      userId: payload.userId || "anonymous",
      timestamp: Date.now(),
      metadata: payload.metadata || {},
      context: {
        environment: env.ENVIRONMENT,
        isUat: env.ENVIRONMENT === "uat",
        clientOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
        clientHref: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof window !== "undefined" ? navigator.userAgent : undefined,
        ...(payload.context || {}),
      },
    });

    // Zero-cost non-blocking background dispatch
    fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
      keepalive: true,
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (env.ENVIRONMENT === "development") {
            console.log(`[AuditPostback] ✅ Success [${res.status}] Log ID: ${data.logId || "recorded"}`);
          }
        }
      })
      .catch((err) => {
        if (env.ENVIRONMENT === "development") {
          console.warn("[AuditPostback] Non-blocking audit dispatch network notice:", err?.message || err);
        }
      });
  } catch {
    // Silently ignore postback failure so Continuum core flow is never impacted
  }
}

/**
 * Detects if an incoming HTTP request originated from an OpenAI Custom GPT / ChatGPT Action agent.
 */
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
 * Dispatches a non-blocking audit postback if the request is identified as a Custom GPT action.
 */
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
