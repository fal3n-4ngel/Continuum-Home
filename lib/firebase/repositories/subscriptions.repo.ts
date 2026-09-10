import { Session } from "@/lib/auth";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";
import {
  assertDocId,
  docsRoot,
  fsFetch,
  FirestoreDocument,
  toFields,
  idFromName,
  runOwnedQuery,
} from "../client";

export interface SubscriptionRecord {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon: string | null;
  createdAt: number;
}

export interface SubscriptionEntry {
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon?: string | null;
}

const SUBSCRIPTION_CACHE_TTL = 3_600_000;

export function subscriptionCacheKey(session: Session): string {
  return `subscriptions:${session.config.projectId}:${session.uid}`;
}

export async function listSubscriptions(session: Session): Promise<SubscriptionRecord[]> {
  const cacheKey = subscriptionCacheKey(session);
  const cached = await cacheGet<SubscriptionRecord[]>(cacheKey);
  if (cached) return cached;

  const rows = await runOwnedQuery(session, "subscriptions");
  const records = rows
    .map(({ id, data }) => ({
      id,
      name: (data.name as string) || "Untitled",
      cost: typeof data.cost === "number" ? data.cost : 0,
      billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
      nextBillingDate: (data.nextBillingDate as string) || "",
      icon: (data.icon as string) || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  await cacheSet(cacheKey, records, SUBSCRIPTION_CACHE_TTL);
  return records;
}

export async function createSubscription(session: Session, entry: SubscriptionEntry) {
  const docData = {
    userId: session.uid,
    name: entry.name,
    cost: entry.cost,
    billingCycle: entry.billingCycle,
    nextBillingDate: entry.nextBillingDate,
    icon: entry.icon || null,
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
  return { id: idFromName(created.name) };
}

export async function deleteSubscription(session: Session, id: string) {
  assertDocId(id, "subscription");

  await fsFetch(session, `${docsRoot(session)}/subscriptions/${id}?currentDocument.exists=true`, {
    method: "DELETE",
  });

  await cacheInvalidate(subscriptionCacheKey(session));
  return { id };
}

export async function updateSubscription(session: Session, id: string, updates: Partial<SubscriptionRecord>) {
  assertDocId(id, "subscription");
  const docData = { ...updates };

  const params = new URLSearchParams();
  Object.keys(updates).forEach((k) => {
    params.append("updateMask.fieldPaths", k);
  });

  await fsFetch(session, `${docsRoot(session)}/subscriptions/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
}
