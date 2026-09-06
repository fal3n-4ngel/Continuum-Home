import { after } from "next/server";
import { env } from "@/lib/utils";
import { notifyError } from "@/lib/utils/error-notifier";
import { DomainEvent } from "./types";

const DEFAULT_MONOLITH_API_URL = "https://monolith-postbacks.adithyakrishnan.com";
const MAX_BODY_BYTES = 16_000;
const TIMEOUT_MS = 10_000;
const MAX_QUEUED_EVENTS = 50;
const ALERT_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

let mutedUntil = 0;
let lastAlertSentAt = 0;
const recentEvents = new Map<string, number>();
const DUP_WINDOW_MS = 500;

/** In-memory fallback queue for events that failed to post during outages. */
const pendingEvents: DomainEvent[] = [];

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

function queueFailedEvent(event: DomainEvent): void {
  const exists = pendingEvents.some(
    (e) =>
      (e.eventId && e.eventId === event.eventId) ||
      (e.eventType === event.eventType && e.entityId === event.entityId && e.userId === event.userId)
  );
  if (!exists) {
    if (pendingEvents.length >= MAX_QUEUED_EVENTS) {
      pendingEvents.shift();
    }
    pendingEvents.push(event);
  }
}

function triggerPostbackAlert(endpoint: string, eventType: string, reason: string, status: number): void {
  const now = Date.now();
  if (now - lastAlertSentAt < ALERT_THROTTLE_MS) return;
  lastAlertSentAt = now;

  notifyError({
    context: "Monolith Domain Event Postback",
    error: new Error(`Domain event postback failed: ${reason}`),
    status,
    isCritical: true,
    extraFields: {
      Endpoint: endpoint,
      "Failed Event": eventType,
      "Queued Events": String(pendingEvents.length + 1),
    },
  });
}

/** Internal handler for delivering a single domain event. */
async function dispatchPostback(event: DomainEvent): Promise<boolean> {
  const environment = env.ENVIRONMENT;
  const verbose = environment !== "production";

  if (Date.now() < mutedUntil) return false;

  const endpoint = resolveEndpoint();
  const auth = authHeader();
  if (!endpoint || !auth) {
    if (verbose && !auth) {
      console.warn("[DomainEvent] MONOLITH_API_KEY unset; skipping", event.eventType);
    }
    return false;
  }

  const body = JSON.stringify({
    sourceApp: "continuum-home",
    eventId: event.eventId || crypto.randomUUID(),
    eventType: event.eventType,
    userId: event.userId,
    entityId: event.entityId,
    itemCount: event.itemCount ?? 1,
    timestamp: Date.now(),
    payload: {
      ...(event.payload ?? {}),
      ...(event.userEmail ? { userEmail: event.userEmail } : {}),
      environment,
    },
  });

  if (body.length > MAX_BODY_BYTES) {
    if (verbose) console.warn(`[DomainEvent] Dropped oversized "${event.eventType}" event`);
    return false;
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
      return false;
    }

    if (response.status === 400) {
      console.warn(`[DomainEvent] Rejected "${event.eventType}" — not in monolith allowlist`);
      return false;
    }

    if (!response.ok) {
      triggerPostbackAlert(endpoint, event.eventType, `HTTP ${response.status} ${response.statusText}`, response.status);
      queueFailedEvent(event);
      return false;
    }

    if (verbose) console.log(`[DomainEvent] ${response.status} — ${event.eventType}`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (verbose) console.warn("[DomainEvent] Delivery failed:", msg);
    triggerPostbackAlert(endpoint, event.eventType, msg, 503);
    queueFailedEvent(event);
    return false;
  }
}

/** Flushes queued pending domain events that failed during previous outages. */
export async function flushPendingDomainEvents(): Promise<{ flushed: number; remaining: number }> {
  if (pendingEvents.length === 0) return { flushed: 0, remaining: 0 };
  let flushed = 0;
  const toProcess = [...pendingEvents];
  for (const ev of toProcess) {
    const success = await dispatchPostback(ev);
    if (success) {
      flushed++;
      const idx = pendingEvents.indexOf(ev);
      if (idx !== -1) pendingEvents.splice(idx, 1);
    } else {
      break;
    }
  }
  return { flushed, remaining: pendingEvents.length };
}

export function getPendingDomainEventsCount(): number {
  return pendingEvents.length;
}

export function resetDomainEventStateForTesting(): void {
  pendingEvents.length = 0;
  lastAlertSentAt = 0;
  mutedUntil = 0;
  recentEvents.clear();
}

/** Domain event dispatch scheduled via Next.js after() with auto-retry queue. */
export function recordDomainEvent(event: DomainEvent): void {
  if (typeof window !== "undefined") return;

  const dedupKey = `${event.eventType}:${event.entityId || ""}`;
  const now = Date.now();
  const lastEmitted = recentEvents.get(dedupKey) || 0;
  if (now - lastEmitted < DUP_WINDOW_MS) {
    return;
  }
  recentEvents.set(dedupKey, now);
  if (recentEvents.size > 100) {
    const oldestKey = recentEvents.keys().next().value;
    if (oldestKey) recentEvents.delete(oldestKey);
  }

  after(async () => {
    const success = await dispatchPostback(event);
    if (success && pendingEvents.length > 0) {
      await flushPendingDomainEvents();
    }
  });
}
