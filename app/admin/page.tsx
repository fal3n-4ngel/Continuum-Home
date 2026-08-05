"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FirebaseUser } from "@/types";
import { Shield, ArrowLeft, LogOut, Home } from "lucide-react";
import { AdminTab } from "@/components/dashboard/AdminTab";

interface FirebaseAuthModule {
  auth: any;
  GoogleAuthProvider: any;
  signInWithPopup: any;
  signOut: any;
}

export default function AdminPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthModule | null>(null);

  // Initialize Firebase Auth
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("firebase/app").then(async ({ initializeApp, getApps }) => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Failed to load auth config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, GoogleAuthProvider, signInWithPopup, signOut } = await import("firebase/auth");
        const auth = getAuth(app);
        setFirebaseAuth({ auth, GoogleAuthProvider, signInWithPopup, signOut });

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
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthLoading(false);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async () => {
    if (!firebaseAuth) return;
    try {
      await firebaseAuth.signInWithPopup(firebaseAuth.auth, new firebaseAuth.GoogleAuthProvider());
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const logout = async () => {
    if (!firebaseAuth) return;
    try {
      await firebaseAuth.signOut(firebaseAuth.auth);
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";
  const isAdmin = user && user.email === adminEmail;

  /* ─── Loading State ─── */
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-7 w-7 text-text-primary animate-pulse" />
          <p className="text-sm text-text-secondary font-mono">Loading Admin Session…</p>
        </div>
      </div>
    );
  }

  /* ─── Login Guard ─── */
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex w-[400px] flex-col gap-6 rounded-none border-2 border-border-subtle bg-bg-card p-8 text-center shadow-none">
          <Shield className="mx-auto h-12 w-12 text-text-muted" />
          <div>
            <h1 className="font-serif text-2xl font-medium italic text-text-primary">Admin Access</h1>
            <p className="mt-2 text-xs text-text-secondary">Please sign in with your administrative account to continue.</p>
          </div>
          <button
            onClick={login}
            className="cursor-pointer rounded-none border-2 border-text-primary bg-text-primary py-2.5 text-xs font-bold uppercase tracking-wide text-bg-card transition-all hover:bg-bg-primary hover:text-text-primary"
          >
            Sign In with Google
          </button>
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 no-underline">
            <ArrowLeft className="h-3 w-3" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Authorization Guard ─── */
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex w-[400px] flex-col gap-6 rounded-none border-2 border-[#dc2626] bg-[#fef2f2] p-8 text-center shadow-none">
          <Shield className="mx-auto h-12 w-12 text-[#dc2626]" />
          <div>
            <h1 className="font-serif text-2xl font-medium italic text-[#991b1b]">Access Denied</h1>
            <p className="mt-2 text-xs text-[#991b1b]/80">Your account ({user.email}) is not authorized to access the admin panel.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              onClick={logout}
              className="cursor-pointer rounded-none border-2 border-[#dc2626] bg-[#dc2626] py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-all hover:bg-white hover:text-[#dc2626]"
            >
              Sign Out
            </button>
            <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 no-underline">
              <ArrowLeft className="h-3 w-3" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main Admin Console ─── */
  return (
    <div className="min-h-screen bg-bg-primary p-10 max-md:p-5">
      <div className="mx-auto max-w-[900px] flex flex-col gap-6">
        {/* Header Action Nav */}
        <div className="flex items-center justify-end gap-3 border-b-2 border-border-subtle pb-4">
          <Link href="/" className="flex items-center gap-1.5 rounded-none border-2 border-border-subtle bg-bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-primary hover:bg-bg-primary no-underline transition-all">
            <Home className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 cursor-pointer rounded-none border-2 border-border-subtle bg-bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#dc2626] hover:bg-[#fef2f2] hover:border-[#dc2626] transition-all">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>

        {/* Embedded Modular Admin Tab component */}
        <AdminTab user={user} />
      </div>
    </div>
  );
}
