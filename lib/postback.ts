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

// High-value analytics & audit event types
export const AUDIT_EVENT_TYPES = {
  EXPENSE_CREATED: "EXPENSE_CREATED",
  EXPENSE_BATCH_CREATED: "EXPENSE_BATCH_CREATED",
  INVESTMENT_MUTATED: "INVESTMENT_MUTATED",
  SUBSCRIPTION_PAID: "SUBSCRIPTION_PAID",
  USER_SESSION_ACTIVE: "USER_SESSION_ACTIVE",
  SECURITY_ALERT: "SECURITY_ALERT",
  CRON_EXECUTED: "CRON_EXECUTED",
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
