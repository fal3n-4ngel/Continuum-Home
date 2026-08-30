import { Session } from "@/lib/auth";
import { ApiError } from "@/lib/utils";

/* ─── Firestore REST transport ───
 * All reads/writes go through the Firestore REST API authenticated with the
 * caller's own Firebase ID token (never an unauthenticated SDK instance), so
 * the per-user Firestore security rules are enforced by the database itself —
 * the API server holds no privileged credentials that could bypass them. */

export const FIRESTORE_HOST = "https://firestore.googleapis.com/v1";

// Document ids appear in REST paths and backtick-quoted field masks; restrict
// them so neither can be broken out of. Covers Firestore auto-ids and UUIDs.
export const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function assertDocId(id: string, what: string): string {
  if (!DOC_ID_RE.test(id)) throw new ApiError(400, `Invalid ${what} id.`);
  return id;
}

export function docsRoot(session: Session): string {
  return `${FIRESTORE_HOST}/projects/${session.config.projectId}/databases/(default)/documents`;
}

export function docName(session: Session, ...segments: string[]): string {
  return `projects/${session.config.projectId}/databases/(default)/documents/${segments.join("/")}`;
}

export async function fsFetch<T = unknown>(session: Session, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.ok) {
    return res.json();
  }

  if (res.status === 404) throw new ApiError(404, "Record not found.");
  if (res.status === 403) throw new ApiError(403, "Permission denied by database security rules.");
  if (res.status === 401) throw new ApiError(401, "Database rejected the authentication token.");

  const detail = await res.text().catch(() => "");
  console.error(`Firestore request failed (${res.status}):`, detail.slice(0, 500));
  throw new ApiError(502, "Database request failed.");
}

/* ─── Firestore value encoding ─── */

// Mirrors the Firestore REST API's discriminated "Value" wire format.
export type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { timestampValue: string };

export interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

export interface RunQueryRow {
  document?: FirestoreDocument;
}

export function toValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  throw new ApiError(400, "Unsupported value type in payload.");
}

export function toFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) fields[key] = toValue(value);
  }
  return fields;
}

export function fromValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return fromFields(v.mapValue?.fields || {});
  if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fromValue);
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}

export function fromFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = fromValue(value);
  }
  return obj;
}

export function idFromName(name: string): string {
  return name.split("/").pop() || name;
}

// Runs a single-collection equality query scoped to the user. The userId
// filter also satisfies the security-rule ownership check for list queries.
export async function runOwnedQuery(session: Session, collectionId: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: session.uid },
        },
      },
    },
  };

  const rows = await fsFetch<RunQueryRow[]>(session, `${docsRoot(session)}:runQuery`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return (rows || [])
    .filter((row): row is Required<RunQueryRow> => !!row.document)
    .map((row) => ({ id: idFromName(row.document.name), data: fromFields(row.document.fields) }));
}
