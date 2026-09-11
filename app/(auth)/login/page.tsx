"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/utils";
import { useTheme } from "@/lib/theme/use-theme";

export default function LoginPage() {
  useTheme();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const res = await fetch("/api/auth/config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged } =
          await import("firebase/auth");
        const auth = getAuth(app);

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
          const hasAttempted = sessionStorage.getItem("redirect_sent");
          if (hasAttempted) {
            sessionStorage.removeItem("redirect_sent");
            setStatus("error");
            setError("Unable to complete sign-in. Please try again from the main page.");
          } else {
            sessionStorage.setItem("redirect_sent", "1");
            setStatus("redirecting");
            await signInWithRedirect(auth, new GoogleAuthProvider());
          }
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

      {status === "redirecting" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-text-primary" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-text-primary">
              Redirecting to Google…
            </p>
            <p className="text-xs text-text-muted">
              Completing secure authentication
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs text-rose-500 max-w-[320px]">{error}</p>
          <Link
            href="/"
            className="rounded-full border border-border-subtle bg-bg-primary px-4 py-2 text-xs font-semibold text-text-primary hover:border-border-hover transition-all"
          >
            ← Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
