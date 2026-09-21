"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { setClientAuthSession } from "@/lib/auth/session-cookie";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton?: (parent: HTMLElement, options: any) => void;
          cancel?: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  clientId?: string | null;
  disabled?: boolean;
}

export function GoogleOneTap({ clientId, disabled = false }: GoogleOneTapProps) {
  const router = useRouter();
  const scriptLoadedRef = useRef(false);
  const initializedRef = useRef(false);

  const initGoogleOneTap = async (resolvedClientId: string) => {
    if (
      disabled ||
      initializedRef.current ||
      typeof window === "undefined" ||
      !window.google?.accounts?.id ||
      !resolvedClientId
    ) {
      return;
    }

    try {
      // 1. Initialize Firebase App and Auth
      const { initializeApp, getApps } = await import("firebase/app");
      const res = await fetch("/api/auth/config");
      if (!res.ok) return;
      const config = await res.json();
      const app = getApps().length ? getApps()[0] : initializeApp(config);

      const { getAuth, GoogleAuthProvider, signInWithCredential } = await import("firebase/auth");
      const auth = getAuth(app);

      // If user is already authenticated, don't display prompt
      if (auth.currentUser) return;

      initializedRef.current = true;

      // 2. Initialize Google Identity Services One Tap
      window.google.accounts.id.initialize({
        client_id: resolvedClientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return;

          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
            setClientAuthSession();
            router.replace("/dashboard");
          } catch (signInErr) {
            console.error("[GoogleOneTap] Sign-in with credential failed:", signInErr);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
      });

      // 3. Display One Tap prompt overlay
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed?.()) {
          console.debug(
            "[GoogleOneTap] Prompt not displayed:",
            notification.getNotDisplayedReason?.()
          );
        } else if (notification.isSkippedMoment?.()) {
          console.debug(
            "[GoogleOneTap] Prompt skipped:",
            notification.getSkippedReason?.()
          );
        } else if (notification.isDismissedMoment?.()) {
          console.debug(
            "[GoogleOneTap] Prompt dismissed:",
            notification.getDismissedReason?.()
          );
        }
      });
    } catch (err) {
      console.warn("[GoogleOneTap] Initialization warning:", err);
    }
  };

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    // Fetch config if clientId wasn't provided directly in props
    if (clientId) {
      if (window.google?.accounts?.id) {
        initGoogleOneTap(clientId);
      }
    } else {
      fetch("/api/auth/config")
        .then((res) => (res.ok ? res.json() : null))
        .then((config) => {
          const fetchedId = config?.googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
          if (fetchedId && window.google?.accounts?.id) {
            initGoogleOneTap(fetchedId);
          }
        })
        .catch(() => {});
    }

    return () => {
      try {
        if (window.google?.accounts?.id?.cancel) {
          window.google.accounts.id.cancel();
        }
      } catch {}
    };
  }, [clientId, disabled]);

  const handleScriptLoad = () => {
    scriptLoadedRef.current = true;
    const targetClientId = clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (targetClientId) {
      initGoogleOneTap(targetClientId);
    } else {
      fetch("/api/auth/config")
        .then((res) => (res.ok ? res.json() : null))
        .then((config) => {
          const fetchedId = config?.googleClientId;
          if (fetchedId) {
            initGoogleOneTap(fetchedId);
          }
        })
        .catch(() => {});
    }
  };

  if (disabled) return null;

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={handleScriptLoad}
    />
  );
}
