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
  // Allow OpenAI ChatGPT GPTs and Apps connector callbacks
  if (
    redirectUri === "https://chatgpt.com/connector_platform_oauth_redirect" ||
    redirectUri.startsWith("https://chatgpt.com/aip/") ||
    redirectUri.startsWith("https://chat.openai.com/aip/")
  ) {
    return true;
  }

  return loadEntries().some((entry) => {
    if (entry.clientId !== clientId) return false;
    if (entry.redirectUri) return entry.redirectUri === redirectUri;
    if (entry.redirectUriPrefix) return redirectUri.startsWith(entry.redirectUriPrefix);
    return false;
  });
}
