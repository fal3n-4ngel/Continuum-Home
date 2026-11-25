import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate, encrypt, decrypt } from "@/lib/utils";
import {
  assertDocId,
  fsFetch,
  FirestoreDocument,
  toFields,
  idFromName,
  userPath,
  listSubcollectionDocs,
} from "../client";
import type { ExpenseSplit, ExpenseType } from "../validators/expense.schema";

export interface ExpenseEntry {
  title: string;
  amount: number;
  category?: string | null;
  date?: string | null;
  notes?: string | null;
  type?: ExpenseType;
  tags?: string[] | null;
  splits?: ExpenseSplit[] | null;
  idempotencyKey?: string | null;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number | null;
  category: string | null;
  date: string | null;
  notes: string | null;
  type?: ExpenseType;
  tags?: string[];
  splits?: ExpenseSplit[];
  idempotencyKey?: string | null;
  createdAt: number;
}

function decryptJsonArray<T>(raw: unknown): T[] | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const parsed = JSON.parse(decrypt(raw));
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

interface EncryptedExpenseRow {
  id: string;
  data: Record<string, unknown>;
}

const EXPENSE_CACHE_TTL = 3_600_000;
const BATCH_CONCURRENCY = 3;

export function expenseCacheKey(session: Session): string {
  return `expenses:v2:${session.config.projectId}:${session.uid}`;
}

export async function getRawExpenses(session: Session): Promise<ExpenseRecord[]> {
  const cacheKey = expenseCacheKey(session);
  let rows = await cacheGet<EncryptedExpenseRow[]>(cacheKey);

  if (!rows) {
    rows = await listSubcollectionDocs(session, "expenses");
    await cacheSet(cacheKey, rows, EXPENSE_CACHE_TTL);
  }

  return rows.map(({ id, data }) => {
    const title = decrypt(data.title as string || "");
    const category = decrypt(data.category as string || "");
    const notes = decrypt(data.notes as string || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;

    const tags = decryptJsonArray<string>(data.tags);
    const splits = decryptJsonArray<ExpenseSplit>(data.splits);
    const type: ExpenseType = data.type === "income" ? "income" : "expense";

    return {
      id,
      title: title || "Untitled",
      amount: (amountParsed === null || isNaN(amountParsed)) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      type,
      ...(tags ? { tags } : {}),
      ...(splits ? { splits } : {}),
      ...(typeof data.idempotencyKey === "string" ? { idempotencyKey: data.idempotencyKey } : {}),
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function listExpenses(
  session: Session,
  filters?: { q?: string; category?: string; from?: string; to?: string; tag?: string; type?: ExpenseType }
): Promise<ExpenseRecord[]> {
  let records = [...(await getRawExpenses(session))];

  if (filters?.q) {
    const qLower = filters.q.toLowerCase();
    records = records.filter(
      (r) =>
        r.title.toLowerCase().includes(qLower) ||
        (r.notes && r.notes.toLowerCase().includes(qLower)) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(qLower)))
    );
  }

  if (filters?.category) {
    const catLower = filters.category.toLowerCase();
    records = records.filter((r) => r.category && r.category.toLowerCase() === catLower);
  }

  if (filters?.tag) {
    const tagLower = filters.tag.toLowerCase();
    records = records.filter((r) => r.tags && r.tags.some((t) => t.toLowerCase() === tagLower));
  }

  if (filters?.type) {
    records = records.filter((r) => (r.type ?? "expense") === filters.type);
  }

  if (filters?.from) {
    records = records.filter((r) => r.date && r.date >= filters.from!);
  }

  if (filters?.to) {
    records = records.filter((r) => r.date && r.date <= filters.to!);
  }

  records.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    return b.createdAt - a.createdAt;
  });

  return records;
}

export async function getCategories(session: Session): Promise<{ id: string; name: string }[]> {
  const records = await getRawExpenses(session);
  const uniqueCategories = new Set<string>();

  records.forEach((r) => {
    if (r.category && r.category.trim()) {
      uniqueCategories.add(r.category.trim());
    }
  });

  return Array.from(uniqueCategories).map((name) => ({ id: name, name }));
}

export async function createExpense(session: Session, entry: ExpenseEntry) {
  const docData: Record<string, unknown> = {
    userId: session.uid,
    title: encrypt(entry.title),
    amount: encrypt(String(entry.amount)),
    category: entry.category ? encrypt(entry.category) : null,
    date: entry.date || new Date().toISOString().slice(0, 10),
    notes: entry.notes ? encrypt(entry.notes) : null,
    type: entry.type === "income" ? "income" : "expense",
    tags: entry.tags && entry.tags.length > 0 ? encrypt(JSON.stringify(entry.tags)) : null,
    splits: entry.splits && entry.splits.length > 0 ? encrypt(JSON.stringify(entry.splits)) : null,
    idempotencyKey: entry.idempotencyKey || null,
    createdAt: Date.now(),
  };

  let targetUrl = userPath(session, "expenses");
  if (entry.idempotencyKey) {
    assertDocId(entry.idempotencyKey, "idempotencyKey");
    targetUrl = `${targetUrl}?documentId=${encodeURIComponent(entry.idempotencyKey)}`;
  }

  try {
    const created = await fsFetch<FirestoreDocument>(session, targetUrl, {
      method: "POST",
      body: JSON.stringify({ fields: toFields(docData) }),
    });

    await cacheInvalidate(expenseCacheKey(session));
    return { id: idFromName(created.name), created: true };
  } catch (err) {
    if (entry.idempotencyKey && err instanceof ApiError && err.status === 409) {
      return { id: entry.idempotencyKey, created: false };
    }
    throw err;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]!) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function createExpenseBatch(session: Session, entries: ExpenseEntry[]) {
  const results = await mapWithConcurrency(entries, BATCH_CONCURRENCY, (entry) => createExpense(session, entry));
  return results.map((r, i) => {
    const entry = entries[i]!;
    if (r.status === "fulfilled") {
      return { success: true, title: entry.title, ...r.value };
    } else {
      return { success: false, title: entry.title, error: (r.reason as Error)?.message || "Unknown error" };
    }
  });
}

export async function updateExpense(session: Session, id: string, entry: Partial<ExpenseEntry>) {
  assertDocId(id, "expense");

  const updateData: Record<string, unknown> = {};
  if (entry.title !== undefined) updateData.title = encrypt(entry.title);
  if (entry.amount !== undefined) updateData.amount = entry.amount !== null ? encrypt(String(entry.amount)) : null;
  if (entry.category !== undefined) updateData.category = entry.category ? encrypt(entry.category) : null;
  if (entry.date !== undefined) updateData.date = entry.date || null;
  if (entry.notes !== undefined) updateData.notes = entry.notes ? encrypt(entry.notes) : null;
  if (entry.type !== undefined) updateData.type = entry.type === "income" ? "income" : "expense";
  if (entry.tags !== undefined) updateData.tags = entry.tags && entry.tags.length > 0 ? encrypt(JSON.stringify(entry.tags)) : null;
  if (entry.splits !== undefined) updateData.splits = entry.splits && entry.splits.length > 0 ? encrypt(JSON.stringify(entry.splits)) : null;

  const params = new URLSearchParams();
  for (const field of Object.keys(updateData)) params.append("updateMask.fieldPaths", field);
  params.append("currentDocument.exists", "true");

  await fsFetch(session, `${userPath(session, "expenses", id)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(updateData) }),
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}

export async function archiveExpense(session: Session, id: string) {
  assertDocId(id, "expense");

  await fsFetch(session, `${userPath(session, "expenses", id)}?currentDocument.exists=true`, {
    method: "DELETE",
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}

export async function getExpense(session: Session, id: string): Promise<ExpenseRecord | null> {
  try {
    assertDocId(id, "expense");
    const all = await getRawExpenses(session);
    return all.find((r) => r.id === id) || null;
  } catch {
    return null;
  }
}
