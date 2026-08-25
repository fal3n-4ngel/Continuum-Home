import { Session } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

const FIRESTORE_HOST = "https://firestore.googleapis.com/v1";
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function assertDocId(id: string, what: string): string {
  if (!DOC_ID_RE.test(id)) throw new ApiError(400, `Invalid ${what} id.`);
  return id;
}

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

export function toFirestoreValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFirestoreFields(v as Record<string, unknown>) } };
  throw new ApiError(400, "Unsupported value type in payload.");
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) fields[key] = toFirestoreValue(value);
  }
  return fields;
}

export function fromFirestoreValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return fromFirestoreFields(v.mapValue?.fields || {});
  if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fromFirestoreValue);
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = fromFirestoreValue(value);
  }
  return obj;
}

export function extractIdFromName(name: string): string {
  return name.split("/").pop() || name;
}

export class FirestoreClient {
  constructor(private session: Session) {}

  get docsRoot(): string {
    return `${FIRESTORE_HOST}/projects/${this.session.config.projectId}/databases/(default)/documents`;
  }

  docName(...segments: string[]): string {
    return `projects/${this.session.config.projectId}/databases/(default)/documents/${segments.join("/")}`;
  }

  async fetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.session.idToken}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (res.ok) return res.json();
    if (res.status === 404) throw new ApiError(404, "Record not found.");
    if (res.status === 403) throw new ApiError(403, "Permission denied by database security rules.");
    if (res.status === 401) throw new ApiError(401, "Database rejected the authentication token.");

    const detail = await res.text().catch(() => "");
    console.error(`Firestore request failed (${res.status}):`, detail.slice(0, 500));
    throw new ApiError(502, "Database request failed.");
  }

  async runOwnedQuery(collectionId: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
    const body = {
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: "userId" },
            op: "EQUAL",
            value: { stringValue: this.session.uid },
          },
        },
      },
    };

    const rows = await this.fetch<RunQueryRow[]>(`${this.docsRoot}:runQuery`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return (rows || [])
      .filter((row): row is Required<RunQueryRow> => !!row.document)
      .map((row) => ({ id: extractIdFromName(row.document.name), data: fromFirestoreFields(row.document.fields) }));
  }
}
