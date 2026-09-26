import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:support@continuum.local";

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    console.warn("[WebPush] Failed to initialize VAPID details:", err);
  }
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendWebPush(
  subscription: webpush.PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!isPushConfigured()) {
    console.warn("[WebPush] VAPID keys are not configured.");
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error: any) {
    if (error?.statusCode === 410 || error?.statusCode === 404) {
      console.info("[WebPush] Subscription expired or unsubscribed.");
    } else {
      console.error("[WebPush] Error sending push notification:", error);
    }
    return false;
  }
}
