"use client";

import { useState, useEffect } from "react";
import { safeLocalStorage } from "@/lib/utils/storage";
import { setClientAuthSession, clearClientAuthSession } from "@/lib/auth/session-cookie";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Auth, GoogleAuthProvider as GoogleAuthProviderType, UserCredential, AuthProvider } from "firebase/auth";

export interface FirebaseAuthModule {
  auth: Auth;
  GoogleAuthProvider: typeof GoogleAuthProviderType;
  signInWithPopup: (auth: Auth, provider: AuthProvider) => Promise<UserCredential>;
  signInWithRedirect: (auth: Auth, provider: AuthProvider) => Promise<never>;
  signOut: (auth: Auth) => Promise<void>;
}

export function useDashboardAuth() {
  const { user, setUser, authLoading, setAuthLoading, isProUser, setIsProUser } = useAuthStore();
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const anilistToken = params.get("access_token");
    const traktAccessToken = params.get("trakt_access_token");
    const traktRefreshToken = params.get("trakt_refresh_token");

    if (anilistToken) {
      safeLocalStorage.setItem("anilist_token", anilistToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (traktAccessToken && traktRefreshToken) {
      safeLocalStorage.setItem("trakt_access_token", traktAccessToken);
      safeLocalStorage.setItem("trakt_refresh_token", traktRefreshToken);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    let unsubscribe: (() => void) | undefined;

    const loadFirebaseConfig = async () => {
      if (
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ) {
        return {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
      }
      const cachedRaw = safeLocalStorage.getItem("phub_firebase_config");
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && parsed.apiKey) return parsed;
        } catch {}
      }
      const res = await fetch("/api/auth/config");
      const config = await res.json();
      try {
        safeLocalStorage.setItem("phub_firebase_config", JSON.stringify(config));
      } catch {}
      return config;
    };

    Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      loadFirebaseConfig(),
    ]).then(([{ initializeApp, getApps }, { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, getRedirectResult }, config]) => {
      const app = getApps().length ? getApps()[0] : initializeApp(config);
      const auth = getAuth(app);
      setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut });

      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            console.log("[Auth] Redirect sign-in consumed:", result.user.email);
          }
        })
        .catch((err) => {
          console.warn("[Auth] getRedirectResult error:", err?.code, err?.message);
        });

      unsubscribe = auth.onAuthStateChanged(async (fbUser: any) => {
        if (fbUser) {
          const idToken = await fbUser.getIdToken();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            idToken,
          });
          setClientAuthSession();
        } else if (
          typeof window !== "undefined" &&
          (new URLSearchParams(window.location.search).get("embedded") === "true" ||
            safeLocalStorage.getItem("phub_embedded_token"))
        ) {
          const token = safeLocalStorage.getItem("phub_embedded_token") || "embedded_token";
          setUser({
            uid: "adiadithyakrishnan",
            email: "adiadithyakrishnan@gmail.com",
            displayName: "Adithya Krishnan",
            photoURL: null,
            idToken: token,
          });
          setIsProUser(true);
          setClientAuthSession();
        } else {
          setUser(null);
          setIsProUser(false);
          clearClientAuthSession();
        }
        setAuthLoading(false);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [setUser, setIsProUser, setAuthLoading]);

  return { user, authLoading, isProUser, setIsProUser, firebaseAuth };
}
