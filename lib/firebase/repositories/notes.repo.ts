import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";
import { docsRoot, fsFetch, FirestoreDocument, toFields, fromFields } from "../client";

export interface NoteRecord {
  id: string;
  content: string;
  updatedAt: number;
}

const NOTE_CACHE_TTL = 3_600_000;

export function noteCacheKey(session: Session): string {
  return `note:${session.config.projectId}:${session.uid}`;
}

export async function getNote(session: Session): Promise<NoteRecord | null> {
  const cacheKey = noteCacheKey(session);
  const cached = await cacheGet<NoteRecord | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/notes/${session.uid}`);
    const data = fromFields(res.fields || {});
    const record = { id: session.uid, content: (data.content as string) || "", updatedAt: (data.updatedAt as number) || 0 };
    await cacheSet(cacheKey, record, NOTE_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, NOTE_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updateNote(session: Session, content: string) {
  const docData = { content, updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "content");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/notes/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(noteCacheKey(session));
}
