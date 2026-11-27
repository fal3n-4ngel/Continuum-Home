import { Session } from "@/lib/auth";
import { getIstDateString } from "@/lib/utils";
import {
  createExpense,
  listSubscriptions,
  updateSubscription,
  type ExpenseEntry,
  type SubscriptionRecord,
} from "@/lib/firebase";

const MAX_CATCHUP_CYCLES = 12;

export function buildRecurringIdempotencyKey(subscriptionId: string, billingDate: string): string {
  const safeId = subscriptionId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 96);
  const safeDate = billingDate.replace(/[^0-9-]/g, "").slice(0, 10);
  return `sub_${safeId}_${safeDate}`;
}

export function advanceRecurringDate(dateStr: string, cycle: "monthly" | "yearly"): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return dateStr;
  const [year, month, day] = parts;
  const targetMonth = cycle === "monthly" ? month : month - 1;
  const targetYear = cycle === "yearly" ? year! + 1 : year!;
  const d = new Date(Date.UTC(targetYear, targetMonth!, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day!, lastDay);
  const yStr = String(d.getUTCFullYear()).padStart(4, "0");
  const mStr = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dStr = String(clampedDay).padStart(2, "0");
  return `${yStr}-${mStr}-${dStr}`;
}

export function collectDueBillingDates(
  nextBillingDate: string,
  cycle: "monthly" | "yearly",
  todayStr: string,
  maxCycles: number = MAX_CATCHUP_CYCLES
): { dueDates: string[]; nextDate: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextBillingDate)) {
    return { dueDates: [], nextDate: nextBillingDate };
  }

  const dueDates: string[] = [];
  let cursor = nextBillingDate;

  while (cursor <= todayStr && dueDates.length < maxCycles) {
    dueDates.push(cursor);
    const advanced = advanceRecurringDate(cursor, cycle);
    if (advanced === cursor) break;
    cursor = advanced;
  }

  return { dueDates, nextDate: cursor };
}

export function getOwnerSubscriptionCost(
  sub: Pick<SubscriptionRecord, "cost" | "type" | "isFamilyPlan" | "familyMembers">
): number {
  if (sub.type === "income" || !sub.isFamilyPlan || !sub.familyMembers || sub.familyMembers.length === 0) {
    return sub.cost;
  }
  const totalMembers = sub.familyMembers.length + 1;
  const defaultShare = sub.cost / totalMembers;
  const membersSum = sub.familyMembers.reduce(
    (sum, m) => sum + (typeof m.share === "number" ? m.share : defaultShare),
    0
  );
  return Math.max(0, Number((sub.cost - membersSum).toFixed(2)));
}

export function buildRecurringExpenseEntry(sub: SubscriptionRecord, billingDate: string): ExpenseEntry {
  const isIncome = sub.type === "income";
  const effectiveAmount = getOwnerSubscriptionCost(sub);
  const isReducedFamily = !isIncome && Boolean(sub.isFamilyPlan && sub.familyMembers && sub.familyMembers.length > 0);
  return {
    title: sub.name,
    amount: effectiveAmount,
    category: sub.category || (isIncome ? "Salary" : "Subscriptions"),
    date: billingDate,
    notes: isIncome
      ? "Auto-posted recurring income"
      : isReducedFamily
      ? `Auto-posted family plan share (${effectiveAmount.toFixed(2)} of ${sub.cost.toFixed(2)})`
      : "Auto-posted subscription",
    type: isIncome ? "income" : "expense",
    tags: sub.tags && sub.tags.length > 0 ? sub.tags : [isIncome ? "recurring-income" : "subscription"],
    idempotencyKey: buildRecurringIdempotencyKey(sub.id, billingDate),
  };
}

export async function autoPostDueSubscriptions(
  session: Session,
  todayStr: string = getIstDateString()
): Promise<{
  posted: number;
  skipped: number;
  items: { subscriptionId: string; date: string; expenseId: string; created: boolean }[];
}> {
  const subscriptions = await listSubscriptions(session);
  const autoSubs = subscriptions.filter((sub) => sub.autoPost && sub.nextBillingDate && sub.nextBillingDate <= todayStr);

  const items: { subscriptionId: string; date: string; expenseId: string; created: boolean }[] = [];
  let posted = 0;
  let skipped = 0;

  for (const sub of autoSubs) {
    const { dueDates, nextDate } = collectDueBillingDates(sub.nextBillingDate, sub.billingCycle, todayStr);
    if (dueDates.length === 0) continue;

    let lastPosted: string | null = sub.lastAutoPostedDate ?? null;

    for (const dueDate of dueDates) {
      const entry = buildRecurringExpenseEntry(sub, dueDate);
      const res = await createExpense(session, entry);
      items.push({
        subscriptionId: sub.id,
        date: dueDate,
        expenseId: res.id,
        created: Boolean(res.created),
      });
      if (res.created) {
        posted++;
      } else {
        skipped++;
      }
      lastPosted = dueDate;
    }

    await updateSubscription(session, sub.id, {
      nextBillingDate: nextDate,
      ...(lastPosted ? { lastAutoPostedDate: lastPosted } : {}),
    });
  }

  return { posted, skipped, items };
}
