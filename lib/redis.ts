import { Redis } from "@upstash/redis";

// Presence of the env vars only proves they were *set*, not that they work.
// A rotated or wrong token still constructs a client fine and then fails on
// every command — which cache.ts and cron-guard.ts both swallow by design, so
// the app silently loses its cache layer with no signal beyond a console
// warning. `redisStatus()` exists so the health cron can actually detect that.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

export type RedisStatus =
  | { state: "disabled" }
  | { state: "ok" }
  | { state: "error"; detail: string };

export async function redisStatus(): Promise<RedisStatus> {
  if (!redis) return { state: "disabled" };
  try {
    await redis.ping();
    return { state: "ok" };
  } catch (err) {
    return { state: "error", detail: err instanceof Error ? err.message : String(err) };
  }
}
