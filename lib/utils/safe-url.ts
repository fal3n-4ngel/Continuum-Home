// Cover images and avatars rendered via <img src> come from third-party API
// responses we don't control (OMDb, TVMaze, Google Books, OpenLibrary,
// AniList, Trakt) or OAuth profile data. Restricting to http(s) before
// rendering rejects `javascript:`/`data:`/other schemes a malicious or
// compromised response could otherwise supply.
export function isSafeImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
