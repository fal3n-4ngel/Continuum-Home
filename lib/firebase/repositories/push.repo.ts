import { getAdminDb } from "../firebase-admin";
import type { UserSession } from "@/lib/auth";
import crypto from "crypto";
import type { PushSubscription } from "web-push";

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: number;
  updatedAt: number;
}

function hashEndpoint(endpoint: string): string {
  return crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export async function savePushSubscription(
  session: UserSession,
  subscription: PushSubscription,
  userAgent?: string
): Promise<StoredPushSubscription> {
  const db = getAdminDb();
  const id = hashEndpoint(subscription.endpoint);
  const now = Date.now();

  const docRef = db
    .collection("users")
    .doc(session.uid)
    .collection("push_subscriptions")
    .doc(id);

  const existing = await docRef.get();
  const data: StoredPushSubscription = {
    id,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    userAgent: userAgent || "",
    createdAt: existing.exists ? (existing.data()?.createdAt || now) : now,
    updatedAt: now,
  };

  await docRef.set(data, { merge: true });
  return data;
}

export async function removePushSubscription(
  session: UserSession,
  endpoint: string
): Promise<void> {
  const db = getAdminDb();
  const id = hashEndpoint(endpoint);
  await db
    .collection("users")
    .doc(session.uid)
    .collection("push_subscriptions")
    .doc(id)
    .delete();
}

export async function getUserPushSubscriptions(
  uid: string
): Promise<StoredPushSubscription[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("push_subscriptions")
    .get();

  return snapshot.docs.map((d) => d.data() as StoredPushSubscription);
}
