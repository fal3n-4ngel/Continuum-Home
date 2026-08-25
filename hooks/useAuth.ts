"use client";

import { useState, useEffect, useCallback } from "react";
import { FirebaseUser } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModules, setAuthModules] = useState<any>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initAuth() {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import("firebase/auth");

        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        const auth = getAuth(app);

        setAuthModules({ auth, GoogleAuthProvider, signInWithPopup, signOut });

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const token = await fbUser.getIdToken();
            setUser({
              uid: fbUser.uid,
              email: fbUser.email || "",
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
              idToken: token,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch (err) {
        console.error("[useAuth] Firebase initialization error:", err);
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    if (!authModules) return;
    const provider = new authModules.GoogleAuthProvider();
    await authModules.signInWithPopup(authModules.auth, provider);
  }, [authModules]);

  const logout = useCallback(async () => {
    if (!authModules) return;
    await authModules.signOut(authModules.auth);
    setUser(null);
  }, [authModules]);

  return {
    user,
    loading,
    loginWithGoogle,
    logout,
  };
}
