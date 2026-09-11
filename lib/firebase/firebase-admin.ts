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
  let snap = await db.collection("users").doc(uid).collection("subscriptions").get();
  if (snap.empty) {
    snap = await db.collection("subscriptions").where("userId", "==", uid).get();
  }
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
