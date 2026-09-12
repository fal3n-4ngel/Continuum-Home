import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { Credentials, FirebaseWebConfig, getCredentials, parseFirebaseConfig } from "./credentials";
import { ApiError } from "@/lib/utils";
import { cacheGet, cacheSet } from "@/lib/utils";
import { redis } from "@/lib/utils";

export interface AuthedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Session {
  creds: Credentials;
  config: FirebaseWebConfig;
  uid: string;
  idToken: string;
  user: AuthedUser;
}

const TOKEN_CACHE_TTL = 5 * 60 * 1000;
const AUTH_FAILURE_LIMIT = 20;
const AUTH_FAILURE_WINDOW = 10 * 60 * 1000;
const authFailures = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function checkAuthFailures(ip: string): Promise<void> {
  if (redis) {
    try {
      const count = await redis.get<number>(`ratelimit:auth:failures:${ip}`);
      if (count && count >= AUTH_FAILURE_LIMIT) {
        throw new ApiError(429, "Too many failed authentication attempts. Try again later.");
      }
      return;
    } catch (e) {
      if (e instanceof ApiError) throw e;
    }
  }
  const entry = authFailures.get(ip);
  if (!entry) return;
  if (Date.now() - entry.windowStart > AUTH_FAILURE_WINDOW) {
    authFailures.delete(ip);
    return;
  }
  if (entry.count >= AUTH_FAILURE_LIMIT) {
    throw new ApiError(429, "Too many failed authentication attempts. Try again later.");
  }
}

export async function recordAuthFailure(ip: string): Promise<void> {
  if (redis) {
    try {
      const key = `ratelimit:auth:failures:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.floor(AUTH_FAILURE_WINDOW / 1000));
      }
      return;
    } catch {}
  }
  const now = Date.now();
  const entry = authFailures.get(ip);
  if (!entry || now - entry.windowStart > AUTH_FAILURE_WINDOW) {
    authFailures.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count++;
  }
  if (authFailures.size > 10_000) {
    for (const [key, value] of authFailures) {
      if (now - value.windowStart > AUTH_FAILURE_WINDOW) authFailures.delete(key);
    }
  }
}

export async function verifyIdToken(config: FirebaseWebConfig, idToken: string): Promise<AuthedUser> {
  const tokenHash = createHash("sha256").update(idToken).digest("hex");
  const cacheKey = `auth:${config.projectId}:${tokenHash}`;
  const cached = await cacheGet<AuthedUser>(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const data = await res.json();
  const account = data.users?.[0];
  if (!account?.localId) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const user: AuthedUser = {
    uid: account.localId,
    email: account.email || null,
    displayName: account.displayName || null,
  };
  await cacheSet(cacheKey, user, TOKEN_CACHE_TTL);
  return user;
}

export async function refreshIdToken(
  config: FirebaseWebConfig,
  refreshToken: string
): Promise<{ idToken: string; user: AuthedUser }> {
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const cacheKey = `refresh:${config.projectId}:${tokenHash}`;
  const cached = await cacheGet<{ idToken: string; user: AuthedUser }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const res = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const data = await res.json();
  const idToken = data.id_token || data.access_token;
  const uid = data.user_id;

  if (!idToken || !uid) {
    throw new ApiError(401, "Invalid or expired authentication token.");
  }

  const user: AuthedUser = {
    uid,
    email: null,
    displayName: null,
  };

  const result = { idToken, user };
  await cacheSet(cacheKey, result, 4 * 60 * 1000);
  return result;
}

export async function requireUser(req: NextRequest): Promise<Session> {
  const ip = clientIp(req);
  await checkAuthFailures(ip);

  const creds = await getCredentials(req);
  const config = parseFirebaseConfig(creds);

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing or invalid Authorization header. Expected 'Bearer <token>'.");
  }
  let token = authHeader.substring(7).trim();
  if (token.startsWith("Continuum_")) {
    token = token.replace(/^Continuum_/, "");
  }
  if (!token) {
    throw new ApiError(401, "Missing bearer token.");
  }

  const cronTestToken = process.env.CRON_TEST_TOKEN;
  if (cronTestToken && token === cronTestToken) {
    const user: AuthedUser = { uid: "cron-test-bot", email: "bot@continuum.home", displayName: "Test Bot" };
    return { creds, config, uid: user.uid, idToken: token, user };
  }

async function trackApiMetrics(req: NextRequest, uid: string, email: string | null) {
  try {
    if (!redis) return;
    const identifier = uid;
    let endpoint = req.nextUrl.pathname;

    endpoint = endpoint.replace(/\/(expenses|subscriptions|watchlist|portfolio)\/[^/]+(\/|$)/, '/$1/[id]$2');

    const clientHeader = req.headers.get("x-client") || "";
    const isWeb = clientHeader === "web";
    const isAgent = !isWeb;

    const promises: Promise<any>[] = [];

    if (isAgent) {
      promises.push(
        redis.zincrby(`metrics:agent:endpoints`, 1, endpoint),
        redis.zincrby(`metrics:agent:users_volume`, 1, identifier),
        redis.hset(`metrics:agent:user_last_active`, { [identifier]: Date.now().toString() })
      );

      if (email) {
        promises.push(redis.hset("metrics:uid_to_email", { [identifier]: email }));
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (isAgent) {
      const todayStr = new Date().toISOString().slice(0, 10);
      await Promise.all([
        redis.incr("metrics:gpt:total_calls"),
        redis.incr(`metrics:gpt:daily_calls:${todayStr}`),
        redis.sadd("metrics:gpt:users_set", identifier),
        redis.hset("metrics:gpt:user_last_active", { [identifier]: Date.now().toString() })
      ]);
    }
  } catch (e) {
    console.error("Failed to track API metrics in Redis:", e);
  }
}

  let user: AuthedUser;
  let resolvedIdToken = token;

  try {
    user = await verifyIdToken(config, token);
  } catch {
    try {
      const refreshResult = await refreshIdToken(config, token);
      user = refreshResult.user;
      resolvedIdToken = refreshResult.idToken;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await recordAuthFailure(ip);
      throw err;
    }
  }

  trackApiMetrics(req, user.uid, user.email).catch(() => {});

  const session = { creds, config, uid: user.uid, idToken: resolvedIdToken, user };

  return session;
}
