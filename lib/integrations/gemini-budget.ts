import { redis } from "@/lib/utils";

// Google's free tier caps gemini-2.5-flash at 20 requests/day PER PROJECT
// (not per user) — shared across every caller: the recommendations cron
// (app/api/cron/recommendations, up to users × 4 types/day) and this route's
// own on-demand fallback (app/api/assistant/recommendations, triggered
// whenever a user opens a type the cron hasn't generated yet). Both must
// reserve against the same counter, or the fallback path can blow through
// whatever the cron already spent — which is exactly what caused the 429s.
//
// Capped below Google's real 20 to leave a safety margin for clock/quota
// boundary drift, not because we know the true remaining count precisely.
const DAILY_LIMIT = 16;

// Plain UTC calendar date — deliberately NOT the IST-based date the two
// routes each use for their own recommendation-storage bucketing (which
// differ from each other by a 6-hour rollover rule). This key only needs to
// roughly track a rolling day for our own throttling; it doesn't need to
// line up with either route's storage date or Google's actual reset clock.
function utcDateBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomically reserves one call against today's shared budget. Returns false
// once the cap is hit — the caller should skip the Gemini call entirely
// rather than attempt it and eat a 429. Fails open (returns true) if Redis
// isn't configured, matching this codebase's existing "best effort, don't
// break local dev" pattern (see lib/cache.ts, lib/cron-guard.ts).
export async function reserveGeminiCall(): Promise<boolean> {
  if (!redis) return true;

  const key = `gemini_budget:${utcDateBucket()}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60 * 60 * 26); // just over a day, auto-cleans
    }
    return count <= DAILY_LIMIT;
  } catch (e) {
    console.warn("[gemini-budget] Redis reserve failed, allowing call:", e);
    return true;
  }
}

// Short-lived per-(uid,type,date) lock so concurrent requests for the same
// not-yet-generated recommendation (multiple tabs/widgets, or several users'
// browsers polling around the same moment) don't each independently call
// Gemini while the first one is still generating and saving. Only the
// caller that acquires the lock should proceed; everyone else should return
// gracefully and let the first request's result land in Firestore.
export async function acquireGenerationLock(uid: string, type: string, dateStr: string): Promise<boolean> {
  if (!redis) return true;

  const key = `gemini_gen_lock:${uid}:${type}:${dateStr}`;
  try {
    const result = await redis.set(key, "1", { nx: true, ex: 30 });
    return result === "OK";
  } catch (e) {
    console.warn("[gemini-budget] Redis lock failed, allowing call:", e);
    return true;
  }
}

// True for the specific Gemini quota-exceeded error (HTTP 429 /
// RESOURCE_EXHAUSTED) — a safety net for when reserveGeminiCall()'s own
// count under- or over-shoots Google's real usage (e.g. the cron and this
// budget counter can drift slightly at day-boundary edges). Lets a caller
// degrade gracefully instead of surfacing a raw SDK error.
export function isGeminiQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("429") || message.includes("Too Many Requests") || message.includes("RESOURCE_EXHAUSTED");
}
