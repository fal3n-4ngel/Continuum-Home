import type { MediaStatus } from "@/types";

const ANILIST_GQL = "https://graphql.anilist.co";

export class AniListError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AniListError";
  }
}

export async function anilistQuery(query: string, variables: Record<string, unknown> = {}, token?: string) {
  const res = await fetch(ANILIST_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new AniListError(`AniList HTTP error (${res.status}): ${res.statusText}`, res.status);
  const data = await res.json();
  if (data?.errors?.length) {
    const msg = data.errors.map((e: { message?: string }) => e.message || "Unknown error").join("; ");
    throw new AniListError(`AniList GraphQL error: ${msg}`, res.status);
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
