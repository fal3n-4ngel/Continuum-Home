import { Redis } from "@upstash/redis";
import { env } from "./env";

// A rotated token still constructs a client fine, then fails every command —
// which cache.ts and cron-guard.ts swallow by design, so the cache layer can
// disappear with no signal beyond a console warning. redisStatus() is how the
// health cron detects that.
export const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
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
