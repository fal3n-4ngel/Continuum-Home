import { redis } from "@/lib/utils";

const DAILY_LIMIT = process.env.GROQ_DAILY_LIMIT
  ? Number(process.env.GROQ_DAILY_LIMIT)
  : process.env.GEMINI_DAILY_LIMIT
  ? Number(process.env.GEMINI_DAILY_LIMIT)
  : 5000;

function utcDateBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function reserveAiCall(): Promise<boolean> {
  if (!redis) return true;

  const key = `ai_budget:${utcDateBucket()}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60 * 60 * 26);
    }
    return count <= DAILY_LIMIT;
  } catch (e) {
    console.warn("[ai-budget] Redis reserve failed, allowing call:", e);
    return true;
  }
}

export async function acquireGenerationLock(uid: string, type: string, dateStr: string): Promise<boolean> {
  if (!redis) return true;

  const key = `ai_gen_lock:${uid}:${type}:${dateStr}`;
  try {
    const result = await redis.set(key, "1", { nx: true, ex: 30 });
    return result === "OK";
  } catch (e) {
    console.warn("[ai-budget] Redis lock failed, allowing call:", e);
    return true;
  }
}

export function isAiQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("429") ||
    message.includes("Too Many Requests") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("rate_limit_exceeded") ||
    message.includes("tokens per minute") ||
    message.includes("requests per minute")
  );
}

export const reserveGeminiCall = reserveAiCall;
export const isGeminiQuotaError = isAiQuotaError;

