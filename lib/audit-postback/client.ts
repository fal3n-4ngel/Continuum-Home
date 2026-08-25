import { env } from "@/lib/env";
import { PostbackPayload } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";

export async function sendAuditPostback(payload: PostbackPayload): Promise<void> {
  // 1. Skip non-production if prodOnly is flagged
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
        if (res.ok && env.ENVIRONMENT === "development") {
          const data = await res.json().catch(() => ({}));
          console.log(`[AuditPostback] ✅ Success [${res.status}] Log ID: ${data.logId || "recorded"}`);
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
