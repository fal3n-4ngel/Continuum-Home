// Client-side Trakt helper. Trakt's API sends no CORS headers, so the browser
// can't call api.trakt.tv directly (fails with "Failed to fetch"). Requests
// go through our own /api/trakt/proxy route instead, which relays them
// server-to-server.
export const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "";

export interface TraktRequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
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
    throw new Error(`Trakt proxy error (${res.status}): ${errText || res.statusText}`);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Trakt response parsing error: ${err instanceof Error ? err.message : String(err)}`);
  }
}
