import { after } from "next/server";
import { env } from "@/lib/utils";
import { DomainEvent } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";
const MAX_BODY_BYTES = 16_000;
const TIMEOUT_MS = 3_000;

let mutedUntil = 0;

function resolveEndpoint(): string | null {
  const rawUrl = process.env.MONOLITH_API_URL || DEFAULT_MONOLITH_API_URL;
  if (!rawUrl) return null;
  return `${rawUrl.replace(/\/$/, "")}/api/v1/events/postback`;
}

/**
 * Unlike the audit postback, this endpoint requires a real credential — a `NEXT_PUBLIC_` key
 * would be readable by anyone with devtools. No key configured means no events, not events
 * nobody can trust.
 */
function authHeader(): Record<string, string> | null {
  const key = process.env.MONOLITH_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : null;
}

/**
 * Fire-and-forget domain event. Never throws and never blocks the response — scheduled via
 * `after()` so it runs once the response is already on its way.
 */
export function recordDomainEvent(event: DomainEvent): void {
  // Server-only: the credential above must never reach a bundle, and after() is a no-op
  // in the browser anyway.
  if (typeof window !== "undefined") return;

  after(async () => {
    const environment = env.ENVIRONMENT;
    // This pipeline requires a credential, so misconfiguration is an easy, silent failure
    // mode — worth logging outside production, not just in local dev.
    const verbose = environment !== "production";

    if (Date.now() < mutedUntil) return;

    const endpoint = resolveEndpoint();
    const auth = authHeader();
    if (!endpoint || !auth) {
      if (verbose && !auth) {
        console.warn("[DomainEvent] MONOLITH_API_KEY unset; skipping", event.eventType);
      }
      return;
    }

    const body = JSON.stringify({
      sourceApp: "continuum-home",
      eventId: crypto.randomUUID(),
      eventType: event.eventType,
      userId: event.userId,
      entityId: event.entityId,
      itemCount: event.itemCount ?? 1,
      timestamp: Date.now(),
      payload: event.payload ?? {},
    });

    if (body.length > MAX_BODY_BYTES) {
      if (verbose) console.warn(`[DomainEvent] Dropped oversized "${event.eventType}" event`);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After")) || 60;
        mutedUntil = Date.now() + retryAfter * 1000;
        if (verbose) console.warn(`[DomainEvent] Rate limited; muted for ${retryAfter}s`);
        return;
      }

      // A 400 means eventType isn't on the monolith's allowlist — a bug worth seeing always.
      if (response.status === 400) {
        console.warn(`[DomainEvent] Rejected "${event.eventType}" — not in monolith allowlist`);
        return;
      }

      if (verbose) console.log(`[DomainEvent] ${response.status} — ${event.eventType}`);
    } catch (error) {
      if (verbose) {
        console.warn("[DomainEvent] Delivery failed:", error instanceof Error ? error.message : error);
      }
    }
  });
}
