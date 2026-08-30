// Client-side AniList GraphQL helper. AniList's API is public/CORS-enabled,
// so unlike Trakt this is called directly from the browser — no proxy route.
import type { MediaStatus } from "@/types";

const ANILIST_GQL = "https://graphql.anilist.co";

export async function anilistQuery(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList HTTP error (${res.status}): ${res.statusText}`);
  const data = await res.json();
  if (data?.errors?.length) {
    const msg = data.errors.map((e: { message?: string }) => e.message || "Unknown error").join("; ");
    throw new Error(`AniList GraphQL error: ${msg}`);
  }
  return data;
}

export const ANILIST_STATUS_MAP: Record<string, MediaStatus> = {
  CURRENT: "watching",
  PLANNING: "plan_to_watch",
  COMPLETED: "completed",
  DROPPED: "dropped",
  PAUSED: "paused",
  REPEATING: "watching",
};

export const TO_ANILIST_STATUS_MAP: Record<string, string> = {
  watching: "CURRENT",
  plan_to_watch: "PLANNING",
  completed: "COMPLETED",
  dropped: "DROPPED",
  paused: "PAUSED",
};
