import type { Session } from "@/lib/auth";
import { ApiError } from "@/lib/utils";
import { createHash } from "crypto";
import type { PushSubscription } from "web-push";
import {
  FirestoreDocument,
  fromFields,
  fsFetch,
  listSubcollectionDocs,
  toFields,
  userPath,
} from "../client";

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
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

export async function savePushSubscription(
  session: Session,
  subscription: PushSubscription,
  userAgent?: string
): Promise<StoredPushSubscription> {
  const id = hashEndpoint(subscription.endpoint);
  const now = Date.now();
  const docPath = userPath(session, "push_subscriptions", id);
  let existing: StoredPushSubscription | null = null;

  try {
    const document = await fsFetch<FirestoreDocument>(session, docPath);
    existing = fromFields(document.fields) as unknown as StoredPushSubscription;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  const data: StoredPushSubscription = {
    id,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    userAgent: userAgent || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await fsFetch(session, docPath, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(data as unknown as Record<string, unknown>) }),
  });

  return data;
}

export async function removePushSubscription(
  session: Session,
  endpoint: string
): Promise<void> {
  const id = hashEndpoint(endpoint);
  await fsFetch(session, `${userPath(session, "push_subscriptions", id)}?currentDocument.exists=true`, {
    method: "DELETE",
  });
}

export async function getUserPushSubscriptions(
  session: Session
): Promise<StoredPushSubscription[]> {
  const documents = await listSubcollectionDocs(session, "push_subscriptions");
  return documents.map(({ id, data }) => ({
    id,
    endpoint: data.endpoint as string,
    keys: data.keys as StoredPushSubscription["keys"],
    userAgent: data.userAgent as string | undefined,
    createdAt: data.createdAt as number,
    updatedAt: data.updatedAt as number,
  }));
}
