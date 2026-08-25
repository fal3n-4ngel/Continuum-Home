import { env } from "@/lib/utils";
import { PostbackPayload } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";


const MAX_BODY_BYTES = 16_000;

let mutedUntil = 0;

function resolveEnvironment(): string {
  if (typeof window === "undefined") return env.ENVIRONMENT;

  const explicit = process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit) return explicit;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "development";
  return host.includes("-git-") || host.includes("vercel.app") ? "uat" : "production";
}

function resolveEndpoint(): string | null {
  const rawUrl =
    process.env.NEXT_PUBLIC_POSTBACK_API_URL ||
    process.env.MONOLITH_API_URL ||
    DEFAULT_MONOLITH_API_URL;

  if (!rawUrl) return null;

  const baseUrl = rawUrl.replace(/\/$/, "");
  return baseUrl.includes("/postback") ? baseUrl : `${baseUrl}/api/v1/audit/postback`;
}

/**
 * Ingest is unauthenticated by design, so no key is sent from the browser — a
 * `NEXT_PUBLIC_` key is readable by anyone who opens devtools and buys nothing.
 * Server-side callers may still present a real key from a server-only variable.
 */
function serverOnlyAuthHeader(): Record<string, string> {
  if (typeof window !== "undefined") return {};
  const key = process.env.MONOLITH_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

function buildBody(payload: PostbackPayload, environment: string): string | null {
  const isBrowser = typeof window !== "undefined";

  const body = JSON.stringify({
    sourceApp: "continuum-home",
    eventType: payload.eventType,
    severity: payload.severity || "INFO",
    userId: payload.userId || "anonymous",
    timestamp: Date.now(),
    metadata: payload.metadata || {},
    context: {
      environment,
      // The receiver reads Origin, Referer, and User-Agent from the request headers
      // itself and trusts those over anything in the body, so re-sending them here
      // is wasted bytes and duplicate index entries.
      // Path without query string: query params routinely carry identifiers we have
      // no reason to put in an audit log.
      ...(isBrowser ? { clientPath: window.location.pathname } : {}),
      ...(payload.context || {}),
    },
  });

  return body.length > MAX_BODY_BYTES ? null : body;
}

/**
 * Fire-and-forget audit postback to the monolith API.
 *
 * <p>Never rejects and never blocks a UI flow: telemetry must not be able to break
 * the thing it is observing.
 */
export async function sendAuditPostback(payload: PostbackPayload): Promise<void> {
  const environment = resolveEnvironment();
  const isDev = environment === "development";

  if (payload.prodOnly && environment !== "production") return;
  if (Date.now() < mutedUntil) return;

  // Deduplicate per browser session if flagged.
  if (payload.oncePerSession && typeof window !== "undefined") {
    const sessionKey = `monolith_audit_sent_${payload.eventType}`;
    try {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // Private browsing or a storage quota error: send anyway rather than lose the event.
    }
  }

  const endpoint = resolveEndpoint();
  if (!endpoint) return;

  try {
    const body = buildBody(payload, environment);
    if (!body) {
      if (isDev) console.warn(`[AuditPostback] Dropped oversized "${payload.eventType}" event`);
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...serverOnlyAuthHeader() },
      body,
      // Survives the page navigation that often immediately follows the event.
      keepalive: true,
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After")) || 60;
      mutedUntil = Date.now() + retryAfter * 1000;
      if (isDev) console.warn(`[AuditPostback] Rate limited; muted for ${retryAfter}s`);
      return;
    }

    if (isDev) {
      const data = await response.json().catch(() => ({}));
      console.log(`[AuditPostback] ${response.status} — ${data.logId || "no log id"}`);
    }
  } catch (error) {
    // Network failures are expected and uninteresting: the endpoint is best-effort.
    if (isDev) {
      console.warn("[AuditPostback] Delivery failed:", error instanceof Error ? error.message : error);
    }
  }
}
