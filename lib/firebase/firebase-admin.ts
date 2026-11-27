import { createHash } from "crypto";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { encrypt, decrypt, ApiError, env, cacheInvalidate } from "@/lib/utils";
import { sendWebPush, isPushConfigured, type PushNotificationPayload } from "@/lib/push/web-push";
import {
  encryptAsset,
  decryptAsset,
  encryptValuationHistory,
  decryptValuationHistory,
  type ExpenseRecord,
  type SubscriptionRecord,
  type PortfolioRecord,
  type InvestmentAsset,
  type WatchlistItem,
  type DailyRecommendation,
} from "./firebase";
import type { SharedSubscription } from "./validators/subscription.schema";

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not configured on this server.");
  }

  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key.");
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, "\n"),
    }),
  });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export interface AdminUser {
  uid: string;
  email: string;
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  const rawUsers: AdminUser[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.email) rawUsers.push({ uid: u.uid, email: u.email });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  if (rawUsers.length === 0) return [];

  const activeUsers: AdminUser[] = [];
  for (const u of rawUsers) {
    try {
      let doc = await db.collection("users").doc(u.uid).collection("settings").doc("preferences").get();
      if (!doc.exists) {
        doc = await db.collection("settings").doc(u.uid).get();
      }
      if (doc.exists && doc.data()?.deleted === true) {
        continue;
      }
      activeUsers.push(u);
    } catch {
      activeUsers.push(u);
    }
  }
  return activeUsers;
}

export async function adminListExpenses(uid: string): Promise<ExpenseRecord[]> {
  const db = getAdminDb();
  let snap = await db.collection("users").doc(uid).collection("expenses").get();
  if (snap.empty) {
    snap = await db.collection("expenses").where("userId", "==", uid).get();
  }
  return snap.docs.map((doc) => {
    const data = doc.data();
    const title = decrypt(data.title || "");
    const category = decrypt(data.category || "");
    const notes = decrypt(data.notes || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;
    let tags: string[] | undefined;
    if (typeof data.tags === "string" && data.tags) {
      try {
        const parsed = JSON.parse(decrypt(data.tags));
        if (Array.isArray(parsed)) tags = parsed;
      } catch {}
    }
    return {
      id: doc.id,
      title: title || "Untitled",
      amount: amountParsed === null || isNaN(amountParsed) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      type: data.type === "income" ? "income" : "expense",
      ...(tags ? { tags } : {}),
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function adminFindUsersByEmails(emails: string[]): Promise<Map<string, AdminUser>> {
  const result = new Map<string, AdminUser>();
  const unique = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) return result;

  const auth = getAdminAuth();
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    try {
      const res = await auth.getUsers(chunk.map((email) => ({ email })));
      for (const u of res.users) {
        if (u.email) {
          result.set(u.email.toLowerCase(), { uid: u.uid, email: u.email });
        }
      }
    } catch (err) {
      console.error("Failed to batch-lookup users by email:", err);
    }
  }
  return result;
}

export async function adminListSharedSubscriptions(uid: string): Promise<SharedSubscription[]> {
  const db = getAdminDb();
  const snap = await db.collection("users").doc(uid).collection("shared_subscriptions").get();
  if (snap.empty) return [];

  const valid: SharedSubscription[] = [];
  const staleRefs: FirebaseFirestore.DocumentReference[] = [];

  await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const ownerUid = String(data.ownerUid || "");
      const subscriptionId = String(data.subscriptionId || "");

      if (ownerUid && subscriptionId) {
        try {
          const ownerSubDoc = await db
            .collection("users")
            .doc(ownerUid)
            .collection("subscriptions")
            .doc(subscriptionId)
            .get();
          const ownerData = ownerSubDoc.data();
          if (!ownerSubDoc.exists || !ownerData?.isFamilyPlan) {
            staleRefs.push(doc.ref);
            return;
          }
        } catch {
          // keep on transient read failure
        }
      }

      valid.push({
        id: doc.id,
        sourceKey: String(data.sourceKey || doc.id),
        subscriptionId,
        ownerUid,
        ownerEmail: String(data.ownerEmail || ""),
        name: String(data.name || "Untitled"),
        icon: typeof data.icon === "string" ? data.icon : null,
        totalCost: typeof data.totalCost === "number" ? data.totalCost : 0,
        memberShare: typeof data.memberShare === "number" ? data.memberShare : 0,
        totalMembers: typeof data.totalMembers === "number" ? data.totalMembers : 2,
        billingCycle: (data.billingCycle === "yearly" ? "yearly" : "monthly") as SharedSubscription["billingCycle"],
        nextBillingDate: String(data.nextBillingDate || ""),
        paidForCycle: typeof data.paidForCycle === "string" ? data.paidForCycle : null,
        category: typeof data.category === "string" ? data.category : null,
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
      });
    })
  );

  if (staleRefs.length > 0) {
    const batch = db.batch();
    staleRefs.forEach((ref) => batch.delete(ref));
    await batch.commit().catch(() => {});
  }

  return valid.sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
}

export async function adminDismissSharedSubscription(uid: string, id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("users").doc(uid).collection("shared_subscriptions").doc(id).delete();
}

export async function adminSendPushToUser(
  uid: string,
  payload: PushNotificationPayload
): Promise<number> {
  if (!isPushConfigured()) return 0;
  try {
    const db = getAdminDb();
    const snap = await db.collection("users").doc(uid).collection("push_subscriptions").get();
    if (snap.empty) return 0;
    const results = await Promise.allSettled(
      snap.docs.map((doc) => {
        const d = doc.data();
        return sendWebPush(
          {
            endpoint: String(d.endpoint || ""),
            keys: {
              p256dh: String(d.keys?.p256dh || ""),
              auth: String(d.keys?.auth || ""),
            },
          },
          payload
        );
      })
    );
    return results.filter((r) => r.status === "fulfilled" && r.value).length;
  } catch (err) {
    console.error(`Failed to send cross-user push to uid ${uid}:`, err);
    return 0;
  }
}

export async function adminSyncSharedSubscription(
  ownerUid: string,
  ownerEmail: string,
  sub: SubscriptionRecord | null,
  subscriptionId: string
): Promise<{ syncedCount: number; removedCount: number }> {
  const db = getAdminDb();
  const sourceKey = `${ownerUid}_${subscriptionId}`;
  const syncIndexRef = db.collection("users").doc(ownerUid).collection("shared_sync_index").doc(subscriptionId);
  const syncIndexSnap = await syncIndexRef.get();
  const previousUids = Array.isArray(syncIndexSnap.data()?.memberUids)
    ? (syncIndexSnap.data()?.memberUids as string[])
    : [];

  const shouldShare = Boolean(
    sub &&
      sub.type !== "income" &&
      sub.isFamilyPlan &&
      sub.familyMembers &&
      sub.familyMembers.length > 0
  );

  const targetByUid = new Map<string, SharedSubscription>();
  if (shouldShare && sub) {
    const members = sub.familyMembers || [];
    const totalMembers = members.length + 1;
    const defaultShare = sub.cost / totalMembers;
    const continuumUsers = await adminFindUsersByEmails(members.map((m) => m.email));

    for (const member of members) {
      const memberUser = continuumUsers.get(member.email.trim().toLowerCase());
      if (!memberUser || memberUser.uid === ownerUid) continue;
      const memberShare = typeof member.share === "number" ? member.share : defaultShare;
      targetByUid.set(memberUser.uid, {
        id: sourceKey,
        sourceKey,
        subscriptionId,
        ownerUid,
        ownerEmail,
        name: sub.name,
        icon: sub.icon,
        totalCost: sub.cost,
        memberShare,
        totalMembers,
        billingCycle: sub.billingCycle,
        nextBillingDate: sub.nextBillingDate,
        paidForCycle: member.paidForCycle ?? null,
        category: sub.category ?? null,
        updatedAt: Date.now(),
      });
    }
  }

  let removedCount = 0;
  const batch = db.batch();
  for (const prevUid of previousUids) {
    if (!targetByUid.has(prevUid)) {
      batch.delete(db.collection("users").doc(prevUid).collection("shared_subscriptions").doc(sourceKey));
      removedCount++;
    }
  }

  const newlyAddedEntries: Array<[string, SharedSubscription]> = [];
  for (const [memberUid, payload] of targetByUid.entries()) {
    const ref = db
      .collection("users")
      .doc(memberUid)
      .collection("shared_subscriptions")
      .doc(sourceKey);
    batch.set(ref, payload);
    if (!previousUids.includes(memberUid)) {
      newlyAddedEntries.push([memberUid, payload]);
    }
  }

  if (targetByUid.size > 0) {
    batch.set(syncIndexRef, { memberUids: Array.from(targetByUid.keys()), updatedAt: Date.now() });
  } else if (syncIndexSnap.exists) {
    batch.delete(syncIndexRef);
  }

  if (removedCount > 0 || targetByUid.size > 0 || syncIndexSnap.exists) {
    await batch.commit();
  }

  for (const [memberUid, payload] of newlyAddedEntries) {
    adminSendPushToUser(memberUid, {
      title: `Shared Plan: ${payload.name}`,
      body: `${ownerEmail} added you (your share: ₹${payload.memberShare.toFixed(2)}/${payload.billingCycle})`,
      url: "/dashboard?tab=expenses",
      tag: `shared-sub-${sourceKey}`,
    }).catch(() => {});
  }

  return { syncedCount: targetByUid.size, removedCount };
}

export async function adminSetFamilyMemberPaidStatus(opts: {
  ownerUid: string;
  ownerEmail: string;
  subscriptionId: string;
  memberEmail: string;
  paid: boolean;
  actor: "owner" | "member";
}): Promise<{ paidForCycle: string | null }> {
  const db = getAdminDb();
  const subRef = db.collection("users").doc(opts.ownerUid).collection("subscriptions").doc(opts.subscriptionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) {
    throw new ApiError(404, "Subscription not found.");
  }

  const data = subSnap.data() || {};
  const nextBillingDate = String(data.nextBillingDate || "");
  const subName = String(data.name || "Subscription");
  const billingCycle = (data.billingCycle === "yearly" ? "yearly" : "monthly") as "monthly" | "yearly";
  const cost = typeof data.cost === "number" ? data.cost : 0;
  const rawMembers = Array.isArray(data.familyMembers) ? (data.familyMembers as Array<Record<string, unknown>>) : [];
  const targetEmail = opts.memberEmail.trim().toLowerCase();

  const memberIdx = rawMembers.findIndex(
    (m) => typeof m.email === "string" && m.email.trim().toLowerCase() === targetEmail
  );
  if (memberIdx === -1) {
    throw new ApiError(403, "Member is not part of this family plan.");
  }

  const paidForCycle = opts.paid ? nextBillingDate : null;
  const updatedMembers = rawMembers.map((m, idx) =>
    idx === memberIdx ? { ...m, paidForCycle } : m
  );

  await subRef.set({ familyMembers: updatedMembers }, { merge: true });

  const projectId = env.FIREBASE_CONFIG ? (JSON.parse(env.FIREBASE_CONFIG) as { projectId?: string }).projectId : undefined;
  if (projectId) {
    await cacheInvalidate(`subscriptions:${projectId}:${opts.ownerUid}`).catch(() => {});
  }

  const memberCount = rawMembers.length + 1;
  const targetMember = rawMembers[memberIdx]!;
  const memberShare = typeof targetMember.share === "number" ? targetMember.share : cost / memberCount;
  const continuumUsers = await adminFindUsersByEmails([targetEmail]);
  const memberUser = continuumUsers.get(targetEmail);

  if (memberUser) {
    const sourceKey = `${opts.ownerUid}_${opts.subscriptionId}`;
    await db
      .collection("users")
      .doc(memberUser.uid)
      .collection("shared_subscriptions")
      .doc(sourceKey)
      .set({ paidForCycle, updatedAt: Date.now() }, { merge: true })
      .catch(() => {});
  }

  if (opts.paid) {
    if (opts.actor === "member") {
      adminSendPushToUser(opts.ownerUid, {
        title: `${subName} — Share Paid`,
        body: `${targetEmail} marked their ${billingCycle} share (₹${memberShare.toFixed(2)}) as paid.`,
        url: "/dashboard?tab=expenses",
        tag: `sub-paid-${opts.subscriptionId}`,
      }).catch(() => {});
    } else if (memberUser) {
      adminSendPushToUser(memberUser.uid, {
        title: `${subName} — Marked Paid`,
        body: `${opts.ownerEmail} marked your share for ${nextBillingDate} as paid.`,
        url: "/dashboard?tab=expenses",
        tag: `sub-paid-${opts.subscriptionId}`,
      }).catch(() => {});
    }
  }

  return { paidForCycle };
}

export async function adminListSubscriptions(uid: string): Promise<SubscriptionRecord[]> {
  const db = getAdminDb();
  let snap = await db.collection("users").doc(uid).collection("subscriptions").get();
  if (snap.empty) {
    snap = await db.collection("subscriptions").where("userId", "==", uid).get();
  }
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const rawMembers = Array.isArray(data.familyMembers) ? data.familyMembers : [];
      const familyMembers = rawMembers
        .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null && typeof (m as Record<string, unknown>).name === "string" && typeof (m as Record<string, unknown>).email === "string")
        .map((m) => ({
          name: m.name as string,
          email: (m.email as string).toLowerCase(),
          ...(typeof m.share === "number" ? { share: m.share } : {}),
          ...(typeof m.paidForCycle === "string" ? { paidForCycle: m.paidForCycle } : {}),
        }));
      return {
        id: doc.id,
        name: (data.name as string) || "Untitled",
        cost: typeof data.cost === "number" ? data.cost : 0,
        billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
        nextBillingDate: (data.nextBillingDate as string) || "",
        icon: (data.icon as string) || null,
        type: (data.type === "income" ? "income" : "expense") as SubscriptionRecord["type"],
        autoPost: Boolean(data.autoPost),
        category: typeof data.category === "string" ? data.category : null,
        tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string") : undefined,
        ...(data.isFamilyPlan ? { isFamilyPlan: true } : {}),
        ...(typeof data.sendMemberEmails === "boolean" ? { sendMemberEmails: data.sendMemberEmails } : {}),
        ...(familyMembers.length > 0 ? { familyMembers } : {}),
        lastAutoPostedDate: typeof data.lastAutoPostedDate === "string" ? data.lastAutoPostedDate : null,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function adminCreateIdempotentExpense(
  uid: string,
  idempotencyKey: string,
  entry: {
    title: string;
    amount: number;
    category?: string | null;
    date: string;
    notes?: string | null;
    type?: "expense" | "income";
    tags?: string[] | null;
  }
): Promise<{ id: string; created: boolean }> {
  const db = getAdminDb();
  const docRef = db.collection("users").doc(uid).collection("expenses").doc(idempotencyKey);
  try {
    await docRef.create({
      userId: uid,
      title: encrypt(entry.title),
      amount: encrypt(String(entry.amount)),
      category: entry.category ? encrypt(entry.category) : null,
      date: entry.date,
      notes: entry.notes ? encrypt(entry.notes) : null,
      type: entry.type === "income" ? "income" : "expense",
      tags: entry.tags && entry.tags.length > 0 ? encrypt(JSON.stringify(entry.tags)) : null,
      splits: null,
      idempotencyKey,
      createdAt: Date.now(),
    });
    return { id: idempotencyKey, created: true };
  } catch (err: unknown) {
    const code = (err as { code?: number | string })?.code;
    if (code === 6 || code === "already-exists") {
      return { id: idempotencyKey, created: false };
    }
    throw err;
  }
}

export async function adminUpdateSubscription(
  uid: string,
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();
  await db.collection("users").doc(uid).collection("subscriptions").doc(id).set(updates, { merge: true });
}

export async function adminGetPortfolio(uid: string): Promise<PortfolioRecord | null> {
  const db = getAdminDb();
  let doc = await db.collection("users").doc(uid).collection("portfolio").doc("summary").get();
  if (!doc.exists) {
    doc = await db.collection("portfolios").doc(uid).get();
  }
  if (!doc.exists) return null;
  const data = doc.data() || {};
  const assetsRaw = Array.isArray(data.assets) ? (data.assets as Record<string, unknown>[]) : [];
  const assets: InvestmentAsset[] = assetsRaw.map(decryptAsset);
  const valHistoryRaw =
    data.valuationHistory && typeof data.valuationHistory === "object" ? (data.valuationHistory as Record<string, unknown>) : {};
  return {
    id: uid,
    assets,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    valuationHistory: decryptValuationHistory(valHistoryRaw),
  };
}

export async function adminUpdatePortfolioValuationHistory(uid: string, valuationHistory: Record<string, number>): Promise<void> {
  const db = getAdminDb();
  await db.collection("portfolios").doc(uid).set({ valuationHistory: encryptValuationHistory(valuationHistory), updatedAt: Date.now() }, { merge: true });
}

export async function adminUpdatePortfolioAssets(uid: string, assets: InvestmentAsset[]): Promise<void> {
  const db = getAdminDb();
  await db.collection("portfolios").doc(uid).set({ assets: assets.map(encryptAsset), updatedAt: Date.now() }, { merge: true });
}

export async function adminReEncryptExpense(
  uid: string,
  id: string,
  entry: { title: string; amount: number | null; category: string | null; notes: string | null }
): Promise<void> {
  const db = getAdminDb();
  await db.collection("users").doc(uid).collection("expenses").doc(id).set(
    {
      userId: uid,
      title: encrypt(entry.title),
      amount: entry.amount !== null ? encrypt(String(entry.amount)) : null,
      category: entry.category ? encrypt(entry.category) : null,
      notes: entry.notes ? encrypt(entry.notes) : null,
    },
    { merge: true }
  );
}

export async function adminListWatchlist(uid: string): Promise<WatchlistItem[]> {
  const db = getAdminDb();
  let doc = await db.collection("users").doc(uid).collection("watchlists").doc("default").get();
  if (!doc.exists) {
    doc = await db.collection("watchlists").doc(uid).get();
  }
  if (!doc.exists) return [];
  const data = doc.data() || {};
  const itemsMap = data.items && typeof data.items === "object" ? (data.items as Record<string, WatchlistItem>) : {};
  return Object.entries(itemsMap)
    .map(([id, item]) => ({ ...item, id }))
    .filter((item) => typeof item.title === "string" && item.title.length > 0);
}

export interface EmailSubscriptions {
  expenses: boolean;
  portfolio: boolean;
  subscriptions: boolean;
}

export async function adminGetEmailSubscriptions(uid: string): Promise<EmailSubscriptions> {
  const db = getAdminDb();
  let doc = await db.collection("users").doc(uid).collection("settings").doc("preferences").get();
  if (!doc.exists) {
    doc = await db.collection("settings").doc(uid).get();
  }
  if (doc.exists && doc.data()?.deleted === true) {
    return { expenses: false, portfolio: false, subscriptions: false };
  }
  const raw = (doc.exists ? doc.data()?.emailSubscriptions : undefined) || {};
  return {
    expenses: raw.expenses !== false,
    portfolio: raw.portfolio === true,
    subscriptions: raw.subscriptions !== false,
  };
}

export async function adminSetEmailSubscriptions(uid: string, updates: Partial<EmailSubscriptions>): Promise<void> {
  const db = getAdminDb();
  await db.collection("users").doc(uid).collection("settings").doc("preferences").set({ emailSubscriptions: updates, updatedAt: Date.now() }, { merge: true });
}

function guestEmailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function adminUnsubscribeGuestEmail(email: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("guest_unsubscribes").doc(guestEmailHash(email)).set({
    unsubscribed: true,
    updatedAt: Date.now(),
  });
}

export async function adminIsGuestEmailUnsubscribed(email: string): Promise<boolean> {
  const db = getAdminDb();
  const doc = await db.collection("guest_unsubscribes").doc(guestEmailHash(email)).get();
  return doc.exists && doc.data()?.unsubscribed === true;
}

export async function adminSaveDailyRecommendation(
  uid: string,
  type: string,
  date: string,
  recommendation: DailyRecommendation
): Promise<void> {
  const db = getAdminDb();
  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await db
    .collection("users")
    .doc(uid)
    .collection("recommendations")
    .doc(`${type}_${date}`)
    .set({ ...recommendation, expireAt });
}

export async function adminPurgeUserData(uid: string): Promise<void> {
  const db = getAdminDb();

  const expensesSnap = await db.collection("expenses").where("userId", "==", uid).get();
  const expensesBatch = db.batch();
  expensesSnap.docs.forEach((doc) => expensesBatch.delete(doc.ref));
  if (!expensesSnap.empty) await expensesBatch.commit();

  const subsSnap = await db.collection("subscriptions").where("userId", "==", uid).get();
  const subsBatch = db.batch();
  subsSnap.docs.forEach((doc) => subsBatch.delete(doc.ref));
  if (!subsSnap.empty) await subsBatch.commit();

  await db.collection("portfolios").doc(uid).delete().catch(() => {});

  await db.collection("watchlists").doc(uid).delete().catch(() => {});

  const userRecsSnap = await db.collection("users").doc(uid).collection("recommendations").get();
  const userRecsBatch = db.batch();
  userRecsSnap.docs.forEach((doc) => userRecsBatch.delete(doc.ref));
  if (!userRecsSnap.empty) await userRecsBatch.commit();

  const recsEntries = await db.collection("recommendations").doc(uid).collection("entries").get();
  const recsBatch = db.batch();
  recsEntries.docs.forEach((doc) => recsBatch.delete(doc.ref));
  if (!recsEntries.empty) await recsBatch.commit();
  await db.collection("recommendations").doc(uid).delete().catch(() => {});

  await db.collection("users").doc(uid).collection("settings").doc("preferences").delete().catch(() => {});
  await db.collection("settings").doc(uid).delete().catch(() => {});

  await db.collection("notes").doc(uid).delete().catch(() => {});
  await db.collection("notepad").doc(uid).delete().catch(() => {});
  const legacyNotepadSnap = await db.collection("notepad").where("userId", "==", uid).get();
  if (!legacyNotepadSnap.empty) {
    const wb = db.batch();
    legacyNotepadSnap.docs.forEach((doc) => wb.delete(doc.ref));
    await wb.commit();
  }
  await db.collection("health_analytics").doc(uid).delete().catch(() => {});
  const legacyWatchlistSnap = await db.collection("watchlist").where("userId", "==", uid).get();
  if (!legacyWatchlistSnap.empty) {
    const wb = db.batch();
    legacyWatchlistSnap.docs.forEach((doc) => wb.delete(doc.ref));
    await wb.commit();
  }
}

export async function adminGetUserCount(): Promise<number> {
  const db = getAdminDb();
  const doc = await db.collection("stats").doc("users").get();
  if (!doc.exists) {
    return 0;
  }
  const data = doc.data();
  return typeof data?.count === "number" ? data.count : 0;
}

export async function incrementUserCount(): Promise<void> {
  const db = getAdminDb();
  await db.collection("stats").doc("users").set(
    { count: FieldValue.increment(1), lastUpdated: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function decrementUserCount(): Promise<void> {
  const db = getAdminDb();
  await db.collection("stats").doc("users").set(
    { count: FieldValue.increment(-1), lastUpdated: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export interface ReleaseNoteRecord {
  id: string;
  version: string;
  title: string;
  content: string;
  publishedAt: number;
  active: boolean;
  publishedBy?: string;
}

export async function adminGetLatestReleaseNote(): Promise<ReleaseNoteRecord | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection("system").doc("release_notes").get();
  if (!doc.exists) return null;
  const data = doc.data() as ReleaseNoteRecord | undefined;
  if (!data || !data.active) return null;
  return data;
}

export async function adminSaveReleaseNote(note: ReleaseNoteRecord): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("system").doc("release_notes").set(note, { merge: true });
}

export async function adminDeactivateReleaseNote(): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection("system").doc("release_notes").set({ active: false, updatedAt: Date.now() }, { merge: true });
}

export async function adminCleanupLegacyCollections(): Promise<{ deletedCount: number; collections: string[] }> {
  const db = getAdminDb();
  if (!db) return { deletedCount: 0, collections: [] };

  const targets = ["notes", "notepad", "watchlist", "health_analytics"];
  let totalDeleted = 0;
  const processed: string[] = [];

  for (const col of targets) {
    try {
      let colDeleted = 0;
      while (true) {
        const snap = await db.collection(col).limit(500).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        colDeleted += snap.size;
        totalDeleted += snap.size;
      }
      if (colDeleted > 0) {
        processed.push(col);
      }
    } catch {}
  }

  return { deletedCount: totalDeleted, collections: processed };
}

export interface MigrationSummary {
  dryRun: boolean;
  usersProcessed: number;
  expensesMigrated: number;
  subscriptionsMigrated: number;
  portfoliosMigrated: number;
  settingsMigrated: number;
  watchlistsMigrated: number;
  details: string[];
}

export async function adminMigrateFirestoreArchitecture(dryRun: boolean = true): Promise<MigrationSummary> {
  const db = getAdminDb();
  if (!db) {
    return {
      dryRun,
      usersProcessed: 0,
      expensesMigrated: 0,
      subscriptionsMigrated: 0,
      portfoliosMigrated: 0,
      settingsMigrated: 0,
      watchlistsMigrated: 0,
      details: ["Database connection unavailable"],
    };
  }

  const userIds = new Set<string>();
  const users = await listAllUsers().catch(() => []);
  users.forEach((u) => userIds.add(u.uid));

  const expensesSnap = await db.collection("expenses").get();
  expensesSnap.docs.forEach((d) => {
    const uid = d.data().userId;
    if (uid) userIds.add(uid);
  });

  const subsSnap = await db.collection("subscriptions").get();
  subsSnap.docs.forEach((d) => {
    const uid = d.data().userId;
    if (uid) userIds.add(uid);
  });

  const settingsSnap = await db.collection("settings").get();
  settingsSnap.docs.forEach((d) => userIds.add(d.id));

  const portfoliosSnap = await db.collection("portfolios").get();
  portfoliosSnap.docs.forEach((d) => userIds.add(d.id));

  const watchlistsSnap = await db.collection("watchlists").get();
  watchlistsSnap.docs.forEach((d) => userIds.add(d.id));

  let expensesMigrated = 0;
  let subscriptionsMigrated = 0;
  let portfoliosMigrated = 0;
  let settingsMigrated = 0;
  let watchlistsMigrated = 0;
  const details: string[] = [];

  for (const uid of userIds) {
    if (!dryRun) {
      await db.collection("users").doc(uid).set({ updatedAt: Date.now() }, { merge: true });
    }
    const userExpenses = expensesSnap.docs.filter((d) => d.data().userId === uid);
    if (userExpenses.length > 0) {
      if (!dryRun) {
        for (let i = 0; i < userExpenses.length; i += 400) {
          const chunk = userExpenses.slice(i, i + 400);
          const batch = db.batch();
          chunk.forEach((d) => {
            const targetRef = db.collection("users").doc(uid).collection("expenses").doc(d.id);
            batch.set(targetRef, d.data(), { merge: true });
          });
          await batch.commit();
        }
      }
      expensesMigrated += userExpenses.length;
    }

    const userSubs = subsSnap.docs.filter((d) => d.data().userId === uid);
    if (userSubs.length > 0) {
      if (!dryRun) {
        for (let i = 0; i < userSubs.length; i += 400) {
          const chunk = userSubs.slice(i, i + 400);
          const batch = db.batch();
          chunk.forEach((d) => {
            const targetRef = db.collection("users").doc(uid).collection("subscriptions").doc(d.id);
            batch.set(targetRef, d.data(), { merge: true });
          });
          await batch.commit();
        }
      }
      subscriptionsMigrated += userSubs.length;
    }

    const portDoc = portfoliosSnap.docs.find((d) => d.id === uid);
    if (portDoc) {
      if (!dryRun) {
        await db.collection("users").doc(uid).collection("portfolio").doc("summary").set(portDoc.data(), { merge: true });
      }
      portfoliosMigrated += 1;
    }

    const setDoc = settingsSnap.docs.find((d) => d.id === uid);
    if (setDoc) {
      if (!dryRun) {
        await db.collection("users").doc(uid).collection("settings").doc("preferences").set(setDoc.data(), { merge: true });
      }
      settingsMigrated += 1;
    }

    const watchDoc = watchlistsSnap.docs.find((d) => d.id === uid);
    if (watchDoc) {
      if (!dryRun) {
        await db.collection("users").doc(uid).collection("watchlists").doc("default").set(watchDoc.data(), { merge: true });
      }
      watchlistsMigrated += 1;
    }

    details.push(`User ${uid}: expenses=${userExpenses.length}, subs=${userSubs.length}, portfolio=${portDoc ? 1 : 0}, settings=${setDoc ? 1 : 0}, watchlist=${watchDoc ? 1 : 0}`);
  }

  return {
    dryRun,
    usersProcessed: userIds.size,
    expensesMigrated,
    subscriptionsMigrated,
    portfoliosMigrated,
    settingsMigrated,
    watchlistsMigrated,
    details,
  };
}

export async function adminPruneMigratedLegacyRecords(): Promise<{ prunedCount: number; collections: string[] }> {
  const db = getAdminDb();
  if (!db) return { prunedCount: 0, collections: [] };

  let prunedCount = 0;
  const processed: string[] = [];

  const legacyCollections = ["expenses", "subscriptions", "portfolios", "settings", "watchlists"];

  for (const col of legacyCollections) {
    try {
      let colDeleted = 0;
      while (true) {
        const snap = await db.collection(col).limit(500).get();
        if (snap.empty) break;
        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        colDeleted += snap.size;
        prunedCount += snap.size;
      }
      if (colDeleted > 0) processed.push(col);
    } catch {}
  }

  return { prunedCount, collections: processed };
}
