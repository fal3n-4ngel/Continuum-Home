import { Session } from "@/lib/auth";
import { cacheGet, cacheSet, cacheInvalidate, encrypt, decrypt, ApiError } from "@/lib/utils";
import {
  assertDocId,
  docsRoot,
  fsFetch,
  FirestoreDocument,
  toFields,
  idFromName,
  runOwnedQuery,
  userPath,
  listSubcollectionDocs,
} from "../client";

export interface ExpenseEntry {
  title: string;
  amount: number;
  category?: string;
  date?: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number | null;
  category: string | null;
  date: string | null;
  notes: string | null;
  createdAt: number;
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
    if (rows.length === 0) {
      rows = await runOwnedQuery(session, "expenses");
    }
    await cacheSet(cacheKey, rows, EXPENSE_CACHE_TTL);
  }

  return rows.map(({ id, data }) => {
    const title = decrypt(data.title as string || "");
    const category = decrypt(data.category as string || "");
    const notes = decrypt(data.notes as string || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;

    return {
      id,
      title: title || "Untitled",
      amount: (amountParsed === null || isNaN(amountParsed)) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function listExpenses(
  session: Session,
  filters?: { q?: string; category?: string; from?: string; to?: string }
): Promise<ExpenseRecord[]> {
  let records = [...(await getRawExpenses(session))];

  if (filters?.q) {
    const qLower = filters.q.toLowerCase();
    records = records.filter(
      (r) =>
        r.title.toLowerCase().includes(qLower) ||
        (r.notes && r.notes.toLowerCase().includes(qLower))
    );
  }

  if (filters?.category) {
    const catLower = filters.category.toLowerCase();
    records = records.filter((r) => r.category && r.category.toLowerCase() === catLower);
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
  const docData = {
    userId: session.uid,
    title: encrypt(entry.title),
    amount: encrypt(String(entry.amount)),
    category: entry.category ? encrypt(entry.category) : null,
    date: entry.date || new Date().toISOString().slice(0, 10),
    notes: entry.notes ? encrypt(entry.notes) : null,
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, userPath(session, "expenses"), {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id: idFromName(created.name) };
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

  const params = new URLSearchParams();
  for (const field of Object.keys(updateData)) params.append("updateMask.fieldPaths", field);
  params.append("currentDocument.exists", "true");

  try {
    await fsFetch(session, `${userPath(session, "expenses", id)}?${params}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: toFields(updateData) }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await fsFetch(session, `${docsRoot(session)}/expenses/${id}?${params}`, {
        method: "PATCH",
        body: JSON.stringify({ fields: toFields(updateData) }),
      });
    } else {
      throw err;
    }
  }

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}

export async function archiveExpense(session: Session, id: string) {
  assertDocId(id, "expense");

  try {
    await fsFetch(session, `${userPath(session, "expenses", id)}?currentDocument.exists=true`, {
      method: "DELETE",
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await fsFetch(session, `${docsRoot(session)}/expenses/${id}?currentDocument.exists=true`, {
        method: "DELETE",
      });
    } else {
      throw err;
    }
  }

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}
