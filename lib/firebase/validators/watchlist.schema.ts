import { z } from "zod";

export const MediaTypeSchema = z.enum(["movie", "show", "anime", "book"]);
export const MediaStatusSchema = z.enum(["plan_to_watch", "watching", "completed", "dropped", "paused"]);

export const WatchlistItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  type: MediaTypeSchema,
  status: MediaStatusSchema,
  progress: z.number().nonnegative(),
  totalEpisodes: z.number().nullable(),
  rating: z.number().nullable(),
  coverImage: z.string().nullable(),
  year: z.number().nullable(),
  updatedAt: z.number(),
  createdAt: z.number(),
  anilistId: z.number().nullable().optional(),
  traktId: z.number().nullable().optional(),
});

export const SearchResultSchema = z.object({
  title: z.string(),
  type: MediaTypeSchema,
  totalEpisodes: z.number().nullable(),
  coverImage: z.string().nullable(),
  year: z.number().nullable(),
  anilistId: z.number().nullable().optional(),
  traktId: z.number().nullable().optional(),
  imdbId: z.string().nullable().optional(),
  tvdbId: z.number().nullable().optional(),
});

export type MediaType = z.infer<typeof MediaTypeSchema>;
export type MediaStatus = z.infer<typeof MediaStatusSchema>;
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
