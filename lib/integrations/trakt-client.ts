export const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "";

export interface TraktRequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

export class TraktError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TraktError";
  }
}

export async function traktRequest(idToken: string | undefined, path: string, opts: TraktRequestOptions = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch("/api/trakt/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken || ""}`,
    },
    body: JSON.stringify({ path: normalizedPath, method: opts.method, token: opts.token, body: opts.body }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new TraktError(`Trakt proxy error (${res.status}): ${errText || res.statusText}`, res.status);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new TraktError(`Trakt response parsing error: ${err instanceof Error ? err.message : String(err)}`, res.status);
  }
}
