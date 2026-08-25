import { env } from "@/lib/env";

export interface PostbackPayload {
  eventType: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  userId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  prodOnly?: boolean;
}

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";

export async function sendAuditPostback(payload: PostbackPayload): Promise<void> {
  // If explicitly flagged as prodOnly and we're not in production, skip dispatching
  if (payload.prodOnly && !env.IS_PRODUCTION) {
    return;
  }

  const rawUrl =
    process.env.NEXT_PUBLIC_POSTBACK_API_URL ||
    process.env.MONOLITH_API_URL ||
    DEFAULT_MONOLITH_API_URL;

  const apiKey =
    process.env.NEXT_PUBLIC_POSTBACK_API_KEY ||
    process.env.MONOLITH_API_KEY;

  if (!rawUrl) return;

  // Resolve target endpoint whether rawUrl is base domain or explicit Cloud Function path
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

    console.log(`[AuditPostback] 🚀 Dispatching [${payload.eventType}] to ${targetEndpoint}`);

    // Non-blocking background fire-and-forget postback to Monolith API / Cloud Functions
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
          console.log(`[AuditPostback] ✅ Success [${res.status}] Log ID: ${data.logId || "recorded"}`);
        } else {
          const errText = await res.text().catch(() => "");
          console.warn(`[AuditPostback] ⚠️ Server returned HTTP ${res.status}: ${errText}`);
        }
      })
      .catch((err) => {
        console.warn("[AuditPostback] ❌ Non-blocking audit dispatch network error:", err?.message || err);
      });
  } catch (err: any) {
    console.warn("[AuditPostback] Unexpected error creating postback payload:", err?.message || err);
  }
}
