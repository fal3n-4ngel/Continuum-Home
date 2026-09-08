import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { encrypt, decrypt, ApiError, env } from "@/lib/utils";
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
      const doc = await db.collection("settings").doc(u.uid).get();
      if (doc.exists && doc.data()?.deleted === true) {
        continue;
      }
      activeUsers.push(u);
    } catch (e) {
      activeUsers.push(u);
    }
  }
  return activeUsers;
}

export async function adminListExpenses(uid: string): Promise<ExpenseRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection("expenses").where("userId", "==", uid).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const title = decrypt(data.title || "");
    const category = decrypt(data.category || "");
    const notes = decrypt(data.notes || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;
    return {
      id: doc.id,
      title: title || "Untitled",
      amount: amountParsed === null || isNaN(amountParsed) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });
}

export async function adminListSubscriptions(uid: string): Promise<SubscriptionRecord[]> {
  const db = getAdminDb();
  const snap = await db.collection("subscriptions").where("userId", "==", uid).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) || "Untitled",
        cost: typeof data.cost === "number" ? data.cost : 0,
        billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
        nextBillingDate: (data.nextBillingDate as string) || "",
        icon: (data.icon as string) || null,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function adminGetPortfolio(uid: string): Promise<PortfolioRecord | null> {
  const db = getAdminDb();
  const doc = await db.collection("portfolios").doc(uid).get();
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
  await db.collection("expenses").doc(id).set(
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
  const doc = await db.collection("watchlists").doc(uid).get();
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
  const doc = await db.collection("settings").doc(uid).get();
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
  await db.collection("settings").doc(uid).set({ emailSubscriptions: updates, updatedAt: Date.now() }, { merge: true });
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
    .collection("recommendations")
    .doc(uid)
    .collection("entries")
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

  const recsEntries = await db.collection("recommendations").doc(uid).collection("entries").get();
  const recsBatch = db.batch();
  recsEntries.docs.forEach((doc) => recsBatch.delete(doc.ref));
  if (!recsEntries.empty) await recsBatch.commit();
  await db.collection("recommendations").doc(uid).delete().catch(() => {});

  await db.collection("settings").doc(uid).delete().catch(() => {});
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
