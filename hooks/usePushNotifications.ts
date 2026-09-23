import { useState, useEffect, useCallback } from "react";
import { safeLocalStorage } from "@/lib/utils/storage";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotifications(idToken?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwRegistration(reg);
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          setIsSubscribed(!!sub);
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !swRegistration) return false;
    setLoading(true);

    try {
      // 1. Request browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      // 2. Fetch VAPID key
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;

      const res = await fetch("/api/push", { headers });
      if (!res.ok) throw new Error("Failed to fetch push notification config.");
      const { vapidPublicKey } = await res.json();

      if (!vapidPublicKey) {
        console.warn("[PWA] No VAPID public key available.");
        setLoading(false);
        return false;
      }

      // 3. Subscribe to push manager
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Save to backend
      const saveRes = await fetch("/api/push", {
        method: "POST",
        headers,
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (saveRes.ok) {
        setIsSubscribed(true);
        safeLocalStorage.setItem("continuum_push_enabled", "1");
        setLoading(false);
        return true;
      } else {
        throw new Error("Failed to save push subscription to server.");
      }
    } catch (err) {
      console.error("[PWA] Push subscription error:", err);
      setLoading(false);
      return false;
    }
  }, [isSupported, swRegistration, idToken]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return false;
    setLoading(true);

    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (idToken) headers.Authorization = `Bearer ${idToken}`;

        await fetch("/api/push", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      safeLocalStorage.removeItem("continuum_push_enabled");
      setLoading(false);
      return true;
    } catch (err) {
      console.error("[PWA] Push unsubscribe error:", err);
      setLoading(false);
      return false;
    }
  }, [swRegistration, idToken]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
