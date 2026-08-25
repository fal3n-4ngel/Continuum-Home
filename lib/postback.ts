// Non-blocking async audit postback client for Continuum Home to send operational events to monolith-api

export interface PostbackPayload {
  eventType: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  userId?: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export async function sendAuditPostback(payload: PostbackPayload): Promise<void> {
  const postbackUrl = process.env.NEXT_PUBLIC_POSTBACK_API_URL || process.env.MONOLITH_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_POSTBACK_API_KEY || process.env.MONOLITH_API_KEY;

  if (!postbackUrl) return;

  try {
    const body = JSON.stringify({
      sourceApp: "continuum-home",
      eventType: payload.eventType,
      severity: payload.severity || "INFO",
      userId: payload.userId || "anonymous",
      timestamp: Date.now(),
      metadata: payload.metadata || {},
      context: payload.context || {
        environment: process.env.NODE_ENV,
      },
    });

    // Non-blocking background fire-and-forget postback
    fetch(`${postbackUrl.replace(/\/$/, "")}/api/v1/audit/postback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
      keepalive: true,
    }).catch((err) => {
      console.warn("[Postback] Non-blocking audit dispatch error:", err?.message || err);
    });
  } catch {
    // Silently ignore postback failure so Continuum core flow is never impacted
  }
}
