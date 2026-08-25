import { redis } from "@/lib/redis";
import { getAdminDb } from "@/lib/firebase-admin";
export { getIstDateString } from "@/lib/dates";


/**
 * Checks if a cron email dispatch for a given user and cron task key has already been executed today.
 */
export async function hasCronBeenSentToday(cronKey: string, uid: string, dateStr: string): Promise<boolean> {
  const lockKey = `cron_sent:${cronKey}:${uid}:${dateStr}`;

  if (redis) {
    try {
      const sent = await redis.get<string>(lockKey);
      if (sent) return true;
    } catch (e) {
      console.warn("[CronGuard] Redis lookup failed, falling back to Firestore:", e);
    }
  }

  try {
    const db = getAdminDb();
    if (db) {
      const docRef = db.collection("users").doc(uid).collection("cron_locks").doc(`${cronKey}_${dateStr}`);
      const snap = await docRef.get();
      if (snap.exists) return true;
    }
  } catch {
    // Firestore not configured or uninitialized — fail open safely
  }

  return false;
}

/**
 * Records that a cron email dispatch for a given user and cron task key succeeded today.
 */
export async function markCronAsSentToday(cronKey: string, uid: string, dateStr: string): Promise<void> {
  const lockKey = `cron_sent:${cronKey}:${uid}:${dateStr}`;

  // 48h TTL outlives any same-day retry without pinning the key forever.
  if (redis) {
    try {
      await redis.set(lockKey, "1", { ex: 172800 });
    } catch (e) {
      console.warn("[CronGuard] Redis set lock failed:", e);
    }
  }

  try {
    const db = getAdminDb();
    if (db) {
      const docRef = db.collection("users").doc(uid).collection("cron_locks").doc(`${cronKey}_${dateStr}`);
      await docRef.set({
        cronKey,
        sentAt: new Date().toISOString(),
        dateStr,
      });
    }
  } catch (e) {
    console.warn("[CronGuard] Firestore write lock failed:", e);
  }
}
