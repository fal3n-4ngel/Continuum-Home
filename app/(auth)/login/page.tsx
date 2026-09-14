"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/utils";
import { useTheme } from "@/lib/theme/use-theme";

export default function LoginPage() {
  useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "signing_in" | "error">("loading");
  const [error, setError] = useState("");
  const [authModules, setAuthModules] = useState<{
    auth: any;
    GoogleAuthProvider: any;
    signInWithPopup: any;
    signInWithRedirect: any;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const res = await fetch("/api/auth/config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const {
          getAuth,
          GoogleAuthProvider,
          signInWithPopup,
          signInWithRedirect,
          getRedirectResult,
          onAuthStateChanged,
        } = await import("firebase/auth");
        const auth = getAuth(app);

        if (!cancelled) {
          setAuthModules({ auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect });
        }

        if (auth.currentUser) {
          window.location.replace("/dashboard");
          return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user && !cancelled) {
            sessionStorage.removeItem("redirect_sent");
            window.location.replace("/dashboard");
          }
        });

        try {
          const result = await getRedirectResult(auth);
          if (result?.user && !cancelled) {
            sessionStorage.removeItem("redirect_sent");
            window.location.replace("/dashboard");
            return;
          }
        } catch (redirectErr: any) {
          console.warn("[Login] Redirect result error:", redirectErr);
        }

        if (!cancelled && !auth.currentUser) {
          setStatus("ready");
        }

        return () => unsubscribe();
      } catch (err: any) {
        console.error("[Login] Error:", err);
        if (!cancelled) {
          setError(err?.message || "Sign-in failed. Please try again.");
          setStatus("error");
        }
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignIn = async () => {
    if (!authModules) return;
    setStatus("signing_in");
    setError("");

    try {
      const provider = new authModules.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await authModules.signInWithPopup(authModules.auth, provider);
    } catch (err: any) {
      console.warn("[Login] Popup error:", err?.code, err?.message);
      if (err?.code === "auth/popup-blocked" || err?.code === "auth/cancelled-popup-request") {
        try {
          sessionStorage.setItem("redirect_sent", "1");
          const provider = new authModules.GoogleAuthProvider();
          await authModules.signInWithRedirect(authModules.auth, provider);
        } catch (redirectErr: any) {
          setError(redirectErr?.message || "Redirect sign-in failed.");
          setStatus("error");
        }
      } else if (err?.code === "auth/popup-closed-by-user") {
        setStatus("ready");
      } else {
        setError(err?.message || "Authentication failed. Please try again.");
        setStatus("error");
      }
    }
  };

  return (
    <div className="flex w-full max-w-[380px] flex-col items-center justify-center rounded-2xl border border-border-subtle bg-bg-card p-8 shadow-subtle gap-6 text-center">
      <div className="flex items-center gap-2.5">
        <LogoMark size={30} className="text-text-primary" />
        <span className="font-serif text-2xl font-bold tracking-tight text-text-primary">
          {SITE_NAME}
        </span>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-subtle border-t-text-primary" />
          <p className="text-xs text-text-muted">Preparing sign-in…</p>
        </div>
      )}

      {status === "signing_in" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-text-primary">Signing you in…</p>
            <p className="text-xs text-text-muted">Completing secure Google authentication</p>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-xs text-text-secondary">
            Sign in with your Google account to access your personal dashboard.
          </p>
          <button
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border-subtle bg-bg-primary px-5 py-3 text-xs font-semibold text-text-primary transition-all duration-200 hover:border-text-primary hover:bg-bg-card shadow-subtle cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-rose-500 max-w-[320px]">{error}</p>
          <button
            onClick={handleSignIn}
            className="rounded-full border border-text-primary bg-text-primary px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-all cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-full border border-border-subtle bg-bg-primary px-4 py-1.5 text-xs font-semibold text-text-primary hover:border-border-hover transition-all"
          >
            ← Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
