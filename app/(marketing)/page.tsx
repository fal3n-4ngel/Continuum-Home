"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";

export default function MarketingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

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
            router.replace("/dashboard" + window.location.search + window.location.hash);
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

  return (
    <LandingPage
      onLogin={() => router.push("/login")}
      firebaseAuthReady={authReady}
    />
  );
}
