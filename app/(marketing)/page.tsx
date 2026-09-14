"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import {
  isClientAuthSessionPresent,
  setClientAuthSession,
  clearClientAuthSession,
} from "@/lib/auth/session-cookie";

export default function MarketingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authApi, setAuthApi] = useState<{
    auth: any;
    GoogleAuthProvider: any;
    signInWithPopup: any;
    signInWithRedirect: any;
  } | null>(null);

  const [isRedirecting, setIsRedirecting] = useState(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const hash = window.location.hash;
      if (
        hash.includes("access_token") ||
        hash.includes("trakt_") ||
        search.includes("trakt_") ||
        search.includes("code=")
      ) {
        return true;
      }
      if (isClientAuthSessionPresent() && !search.includes("logout")) {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        hash.includes("access_token") ||
        hash.includes("trakt_") ||
        search.includes("trakt_") ||
        search.includes("code=")
      ) {
        window.location.replace("/dashboard" + search + hash);
        return;
      }

      if (isClientAuthSessionPresent() && !search.includes("logout")) {
        window.location.replace("/dashboard" + search + hash);
        return;
      }
    }

    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) return;
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);
        const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } =
          await import("firebase/auth");
        const auth = getAuth(app);
        setAuthApi({ auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect });
        setAuthReady(true);
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            setClientAuthSession();
            setIsRedirecting(true);
            router.replace("/dashboard" + window.location.search + window.location.hash);
          } else {
            clearClientAuthSession();
            setIsRedirecting(false);
          }
        });
      } catch (err) {
        console.error(err);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const handleLogin = async () => {
    if (!authApi) {
      router.push("/login");
      return;
    }

    try {
      const provider = new authApi.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await authApi.signInWithPopup(authApi.auth, provider);
    } catch (err: any) {
      console.warn("[Login] Popup failed or closed:", err?.code, err?.message);
      if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
        try {
          const provider = new authApi.GoogleAuthProvider();
          await authApi.signInWithRedirect(authApi.auth, provider);
        } catch {
          router.push("/login");
        }
      } else if (err?.code !== "auth/popup-closed-by-user") {
        router.push("/login");
      }
    }
  };

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F1EB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#DCD8D0] border-t-[#1A1A1A]" />
          <span className="font-mono text-xs tracking-wider text-[#6B685F] uppercase">
            Opening Dashboard…
          </span>
        </div>
      </div>
    );
  }

  return (
    <LandingPage
      onLogin={handleLogin}
      firebaseAuthReady={authReady}
    />
  );
}
