import { after } from "next/server";
import { env } from "@/lib/utils";
import { DomainEvent } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";
const MAX_BODY_BYTES = 16_000;
const TIMEOUT_MS = 3_000;

/** Set by a 429 so a rate-limited monolith isn't hammered by every subsequent request. */
let mutedUntil = 0;

function resolveEndpoint(): string | null {
  const rawUrl = process.env.MONOLITH_API_URL || DEFAULT_MONOLITH_API_URL;
  if (!rawUrl) return null;
  return `${rawUrl.replace(/\/$/, "")}/api/v1/events/postback`;
}

/**
 * Unlike the audit postback, this endpoint requires a real credential — which is exactly why
 * domain events are server-only. A `NEXT_PUBLIC_` key would be readable by anyone with
 * devtools, and an unauthenticated events endpoint would let anyone fabricate an expense
 * record. No key configured means no events, rather than events nobody can trust.
 */
function authHeader(): Record<string, string> | null {
  const key = process.env.MONOLITH_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : null;
}

/**
 * Fire-and-forget domain event.
 *
 * <p>Never throws and never blocks the response: the record it describes is already committed
 * in Firestore by the time this runs, so failing to report it must not fail the request that
 * succeeded. Scheduled via `after()` so it runs once the response is already on its way.
 */
export function recordDomainEvent(event: DomainEvent): void {
  // Server-only by construction: the credential below must never reach a bundle, and `after()`
  // has no meaning in a browser. Guarded rather than enforced with the `server-only` package to
  // avoid taking a dependency for a single import.
  if (typeof window !== "undefined") return;

  after(async () => {
    const environment = env.ENVIRONMENT;
    const isDev = environment === "development";

    if (Date.now() < mutedUntil) return;

    const endpoint = resolveEndpoint();
    const auth = authHeader();
    if (!endpoint || !auth) {
      if (isDev && !auth) {
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
      if (isDev) console.warn(`[DomainEvent] Dropped oversized "${event.eventType}" event`);
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
        if (isDev) console.warn(`[DomainEvent] Rate limited; muted for ${retryAfter}s`);
        return;
      }

      // A 400 means the event name isn't on the monolith's allowlist — a bug worth seeing
      // rather than a transient failure, so it's logged in every environment.
      if (response.status === 400) {
        console.warn(`[DomainEvent] Rejected "${event.eventType}" — not in monolith allowlist`);
        return;
      }

      if (isDev) console.log(`[DomainEvent] ${response.status} — ${event.eventType}`);
    } catch (error) {
      // Network failures and timeouts are expected and uninteresting: delivery is best-effort.
      if (isDev) {
        console.warn("[DomainEvent] Delivery failed:", error instanceof Error ? error.message : error);
      }
    }
  });
}
