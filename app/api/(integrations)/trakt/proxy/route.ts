import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRAKT_API = "https://api.trakt.tv";

const ALLOWED_METHODS = new Set(["GET", "POST", "DELETE"]);
const ALLOWED_PATH_PREFIXES = ["/users/", "/sync/", "/search/", "/shows/", "/movies/"];

export function resolveTraktUrl(path: unknown): URL {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new ApiError(400, "'path' must be a string starting with '/'.");
  }
  if (path.startsWith("//") || path.startsWith("/\\") || path.includes("\\") || path.includes("..") || /[\s\x00-\x1f\x7f]/.test(path)) {
    throw new ApiError(400, "Invalid 'path': traversal and scheme tricks are rejected.");
  }
  if (!ALLOWED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new ApiError(400, "This Trakt endpoint is not allowed.");
  }

  let url: URL;
  try {
    url = new URL(path, TRAKT_API);
  } catch {
    throw new ApiError(400, "Invalid 'path'.");
  }
  if (
    url.origin !== TRAKT_API ||
    url.protocol !== "https:" ||
    url.hostname !== "api.trakt.tv" ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443")
  ) {
    throw new ApiError(400, "Invalid 'path': must resolve to api.trakt.tv over HTTPS.");
  }
  if (!ALLOWED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new ApiError(400, "This Trakt endpoint is not allowed.");
  }
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const { creds } = await requireUser(req);

    if (!creds.traktClientId) {
      throw new ApiError(500, "Trakt client ID is not configured.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const { path, method, token, body: forwardBody } = (body || {}) as Record<string, unknown>;
    const url = resolveTraktUrl(path);

    const upstreamMethod = typeof method === "string" ? method.toUpperCase() : "GET";
    if (!ALLOWED_METHODS.has(upstreamMethod)) {
      throw new ApiError(400, "'method' must be GET, POST, or DELETE.");
    }
    if (token !== undefined && typeof token !== "string") {
      throw new ApiError(400, "'token' must be a string.");
    }

    const traktRes = await fetch(url, {
      method: upstreamMethod,
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": creds.traktClientId,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: forwardBody !== undefined && upstreamMethod !== "GET" ? JSON.stringify(forwardBody) : undefined,
    });

    const text = await traktRes.text();
    return new NextResponse(text || null, {
      status: traktRes.status,
      headers: { "Content-Type": traktRes.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return toErrorResponse(error, "POST /api/trakt/proxy");
  }
}
