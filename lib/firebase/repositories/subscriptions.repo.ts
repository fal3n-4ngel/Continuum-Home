import { Session } from "@/lib/auth";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";
import {
  assertDocId,
  fsFetch,
  FirestoreDocument,
  toFields,
  idFromName,
  userPath,
  listSubcollectionDocs,
} from "../client";
import type { FamilyMember, SharedSubscription, SubscriptionType } from "../validators/subscription.schema";

export interface SubscriptionRecord {
  id: string;
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon: string | null;
  type?: SubscriptionType;
  autoPost?: boolean;
  category?: string | null;
  tags?: string[];
  isFamilyPlan?: boolean;
  sendMemberEmails?: boolean;
  familyMembers?: FamilyMember[];
  lastAutoPostedDate?: string | null;
  createdAt: number;
}

export interface SubscriptionEntry {
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon?: string | null;
  type?: SubscriptionType;
  autoPost?: boolean;
  category?: string | null;
  tags?: string[];
  isFamilyPlan?: boolean;
  sendMemberEmails?: boolean;
  familyMembers?: FamilyMember[];
}

function parseFamilyMembers(raw: unknown): FamilyMember[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const members: FamilyMember[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const m = item as Record<string, unknown>;
    if (typeof m.name !== "string" || typeof m.email !== "string") continue;
    members.push({
      name: m.name,
      email: m.email,
      ...(typeof m.share === "number" ? { share: m.share } : {}),
      ...(typeof m.paidForCycle === "string" ? { paidForCycle: m.paidForCycle } : {}),
    });
  }
  return members.length > 0 ? members : undefined;
}

const SUBSCRIPTION_CACHE_TTL = 3_600_000;

export function subscriptionCacheKey(session: Session): string {
  return `subscriptions:${session.config.projectId}:${session.uid}`;
}

export async function listSubscriptions(session: Session): Promise<SubscriptionRecord[]> {
  const cacheKey = subscriptionCacheKey(session);
  const cached = await cacheGet<SubscriptionRecord[]>(cacheKey);
  if (cached) return cached;

  const rows = await listSubcollectionDocs(session, "subscriptions");

  const records = rows
    .map(({ id, data }) => {
      const familyMembers = parseFamilyMembers(data.familyMembers);
      return {
        id,
        name: (data.name as string) || "Untitled",
        cost: typeof data.cost === "number" ? data.cost : 0,
        billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
        nextBillingDate: (data.nextBillingDate as string) || "",
        icon: (data.icon as string) || null,
        type: (data.type === "income" ? "income" : "expense") as SubscriptionType,
        autoPost: Boolean(data.autoPost),
        category: typeof data.category === "string" ? data.category : null,
        tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string") : undefined,
        ...(data.isFamilyPlan ? { isFamilyPlan: true } : {}),
        ...(typeof data.sendMemberEmails === "boolean" ? { sendMemberEmails: data.sendMemberEmails } : {}),
        ...(familyMembers ? { familyMembers } : {}),
        lastAutoPostedDate: typeof data.lastAutoPostedDate === "string" ? data.lastAutoPostedDate : null,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
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
    type: entry.type === "income" ? "income" : "expense",
    autoPost: Boolean(entry.autoPost),
    category: entry.category || null,
    tags: entry.tags && entry.tags.length > 0 ? entry.tags : null,
    isFamilyPlan: Boolean(entry.isFamilyPlan),
    sendMemberEmails: entry.sendMemberEmails !== false,
    familyMembers: entry.familyMembers && entry.familyMembers.length > 0 ? entry.familyMembers : null,
    lastAutoPostedDate: null,
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, userPath(session, "subscriptions"), {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
  return { id: idFromName(created.name) };
}

export async function deleteSubscription(session: Session, id: string) {
  assertDocId(id, "subscription");

  await fsFetch(session, `${userPath(session, "subscriptions", id)}?currentDocument.exists=true`, {
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

  await fsFetch(session, `${userPath(session, "subscriptions", id)}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
}

export async function getSubscription(session: Session, id: string): Promise<SubscriptionRecord | null> {
  try {
    assertDocId(id, "subscription");
    const all = await listSubscriptions(session);
    return all.find((r) => r.id === id) || null;
  } catch {
    return null;
  }
}

export async function listSharedSubscriptions(session: Session): Promise<SharedSubscription[]> {
  const rows = await listSubcollectionDocs(session, "shared_subscriptions");
  return rows
    .map(({ id, data }) => ({
      id,
      sourceKey: String(data.sourceKey || id),
      subscriptionId: String(data.subscriptionId || ""),
      ownerUid: String(data.ownerUid || ""),
      ownerEmail: String(data.ownerEmail || ""),
      name: String(data.name || "Untitled"),
      icon: typeof data.icon === "string" ? data.icon : null,
      totalCost: typeof data.totalCost === "number" ? data.totalCost : 0,
      memberShare: typeof data.memberShare === "number" ? data.memberShare : 0,
      totalMembers: typeof data.totalMembers === "number" ? data.totalMembers : 2,
      billingCycle: (data.billingCycle === "yearly" ? "yearly" : "monthly") as SharedSubscription["billingCycle"],
      nextBillingDate: String(data.nextBillingDate || ""),
      category: typeof data.category === "string" ? data.category : null,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    }))
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
}

export async function dismissSharedSubscription(session: Session, id: string) {
  assertDocId(id, "shared subscription");
  await fsFetch(session, `${userPath(session, "shared_subscriptions", id)}?currentDocument.exists=true`, {
    method: "DELETE",
  });
  return { id };
}
