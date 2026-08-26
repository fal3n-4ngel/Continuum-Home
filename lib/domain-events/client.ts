import { after } from "next/server";
import { env } from "@/lib/utils";
import { DomainEvent } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://api.adithyakrishnan.com";
const MAX_BODY_BYTES = 16_000;
const TIMEOUT_MS = 3_000;

let mutedUntil = 0;
const recentEvents = new Map<string, number>();
const DUP_WINDOW_MS = 500;

function resolveEndpoint(): string | null {
  const rawUrl = process.env.MONOLITH_API_URL || DEFAULT_MONOLITH_API_URL;
  if (!rawUrl) return null;
  return `${rawUrl.replace(/\/$/, "")}/api/v1/events/postback`;
}

/** Resolves MONOLITH_API_KEY authorization header. */
function authHeader(): Record<string, string> | null {
  const key = process.env.MONOLITH_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : null;
}

/** Fire-and-forget domain event dispatch scheduled via Next.js after(). */
export function recordDomainEvent(event: DomainEvent): void {
  if (typeof window !== "undefined") return;

  const dedupKey = `${event.eventType}:${event.entityId || ""}`;
  const now = Date.now();
  const lastEmitted = recentEvents.get(dedupKey) || 0;
  if (now - lastEmitted < DUP_WINDOW_MS) {
    return;
  }
  recentEvents.set(dedupKey, now);
  // Keep cache small
  if (recentEvents.size > 100) {
    const oldestKey = recentEvents.keys().next().value;
    if (oldestKey) recentEvents.delete(oldestKey);
  }

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
      eventId: event.eventId || crypto.randomUUID(),
      eventType: event.eventType,
      userId: event.userId,
      entityId: event.entityId,
      itemCount: event.itemCount ?? 1,
      timestamp: Date.now(),
      // environment rides in payload rather than as its own DTO field: Monolith already
      // captures payload as freeform JSON, so this needs no schema change on that side.
      payload: {
        ...(event.payload ?? {}),
        ...(event.userEmail ? { userEmail: event.userEmail } : {}),
        environment,
      },
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
