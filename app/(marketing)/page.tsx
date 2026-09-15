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
        const { getAuth, onAuthStateChanged } = await import("firebase/auth");
        const auth = getAuth(app);
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

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3EFEA] dark:bg-[#0C0D0E]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#DDD5CB] dark:border-[#25272E] border-t-[#9E5D48]" />
          <span className="font-mono text-xs tracking-wider text-[#6D635C] dark:text-[#9BA1B0] uppercase">
            Opening Dashboard…
          </span>
        </div>
      </div>
    );
  }

  return (
    <LandingPage
      onLogin={() => router.push("/login")}
      firebaseAuthReady={authReady}
    />
  );
}
