// Registered OAuth clients allowed to complete the /api/oauth/authorize flow
// and receive a user's Firebase refresh token. Without this, any client_id/
// redirect_uri pair was accepted verbatim and the auth code (which resolves
// to the user's permanent refresh token) was redirected wherever the caller
// asked — a crafted link could exfiltrate any authorizing user's account.
//
// OAUTH_ALLOWED_CLIENTS is a JSON array of either:
//   { "clientId": "monolith-dashboard", "redirectUri": "https://exact/match/callback" }
//   { "clientId": "chatgpt", "redirectUriPrefix": "https://chatgpt.com/aip/" }
// Prefix entries exist for platforms like ChatGPT Actions, whose callback
// URL embeds a per-GPT id we don't control or know ahead of time
// (https://chatgpt.com/aip/{g-id}/oauth/callback) — the prefix still pins
// the redirect to that platform's own domain.
interface OAuthClientEntry {
  clientId: string;
  redirectUri?: string;
  redirectUriPrefix?: string;
}

let cachedEntries: OAuthClientEntry[] | null = null;

function loadEntries(): OAuthClientEntry[] {
  if (cachedEntries) return cachedEntries;

  const raw = process.env.OAUTH_ALLOWED_CLIENTS;
  if (!raw) {
    cachedEntries = [];
    return cachedEntries;
  }

  try {
    const parsed = JSON.parse(raw);
    cachedEntries = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("OAUTH_ALLOWED_CLIENTS is not valid JSON — no OAuth clients will be permitted.");
    cachedEntries = [];
  }

  return cachedEntries;
}

export function isAllowedOAuthRedirect(clientId: string, redirectUri: string): boolean {
  return loadEntries().some((entry) => {
    if (entry.clientId !== clientId) return false;
    if (entry.redirectUri) return entry.redirectUri === redirectUri;
    if (entry.redirectUriPrefix) return redirectUri.startsWith(entry.redirectUriPrefix);
    return false;
  });
}
