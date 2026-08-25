import { Session } from "@/lib/auth";
import { FirestoreClient } from "../firebase-client";
import { ExpenseRecord } from "@/lib/firebase/validators/expense.schema";
import { decrypt } from "@/lib/utils";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";

const EXPENSE_CACHE_TTL = 3_600_000;

export class ExpensesService {
  private client: FirestoreClient;

  constructor(private session: Session) {
    this.client = new FirestoreClient(session);
  }

  private get cacheKey(): string {
    return `expenses:${this.session.config.projectId}:${this.session.uid}`;
  }

  async list(filters?: { q?: string; category?: string; from?: string; to?: string }): Promise<ExpenseRecord[]> {
    const cached = await cacheGet<ExpenseRecord[]>(this.cacheKey);
    let records: ExpenseRecord[];

    if (cached) {
      records = cached;
    } else {
      const rows = await this.client.runOwnedQuery("expenses");
      records = rows.map(({ id, data }) => {
        const title = decrypt((data.title as string) || "");
        const category = decrypt((data.category as string) || "");
        const notes = decrypt((data.notes as string) || "");
        const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
        const amountParsed = amountStr ? parseFloat(amountStr) : null;

        return {
          id,
          title: title || "Untitled",
          amount: amountParsed === null || isNaN(amountParsed) ? null : amountParsed,
          category: category || null,
          date: (data.date as string) || null,
          notes: notes || null,
          createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        };
      });

      await cacheSet(this.cacheKey, records, EXPENSE_CACHE_TTL);
    }

    let filtered = [...records];
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(q) || (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    if (filters?.category) {
      filtered = filtered.filter((r) => r.category === filters.category);
    }
    if (filters?.from) {
      filtered = filtered.filter((r) => r.date && r.date >= filters.from!);
    }
    if (filters?.to) {
      filtered = filtered.filter((r) => r.date && r.date <= filters.to!);
    }

    return filtered.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  async invalidateCache(): Promise<void> {
    await cacheInvalidate(this.cacheKey);
  }
}
