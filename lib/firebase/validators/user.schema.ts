import { z } from "zod";

export const FirebaseUserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().nullable(),
  idToken: z.string().min(1),
});

export const AniListUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  token: z.string(),
});

export const TraktUserSchema = z.object({
  username: z.string(),
  name: z.string().nullable(),
  avatar: z.string().nullable(),
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type FirebaseUser = z.infer<typeof FirebaseUserSchema>;
export type AniListUser = z.infer<typeof AniListUserSchema>;
export type TraktUser = z.infer<typeof TraktUserSchema>;
