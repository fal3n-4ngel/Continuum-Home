"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/utils";
import { safeSessionStorage } from "@/lib/utils/storage";
import { useTheme } from "@/lib/theme/use-theme";
import { GoogleAuthProvider, signInWithRedirect, type Auth } from "firebase/auth";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.58H1.25a11.98 11.98 0 0 0 0 10.84l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function LoginPage() {
  useTheme();
  const [status, setStatus] = useState<"loading" | "ready" | "authenticating" | "error" | "redirecting">("loading");
  const [error, setError] = useState("");
  const [isInteractiveSigningIn, setIsInteractiveSigningIn] = useState(false);
  const authRef = useRef<any>(null);

  const handleGoogleSignIn = async () => {
    if (!authRef.current || isInteractiveSigningIn) return;
    setIsInteractiveSigningIn(true);
    setError("");
    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
        await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(authRef.current, provider);
        if (result?.user) {
          sessionStorage.removeItem("redirect_sent");
          window.location.replace("/dashboard");
        }
      } catch (popupErr: any) {
        if (
          popupErr.code === "auth/popup-blocked" ||
          popupErr.code === "auth/cancelled-popup-request"
        ) {
          sessionStorage.setItem("redirect_sent", "1");
          setStatus("redirecting");
          await signInWithRedirect(authRef.current, provider);
        } else if (popupErr.code === "auth/popup-closed-by-user") {
          setError("Sign-in window was closed. Please try again.");
          setStatus("error");
        } else {
          throw popupErr;
        }
      }
    } catch (err: any) {
      console.error("[Login] Interactive sign-in error:", err);
      setError(err?.message || "Sign-in failed. Please try again.");
      setStatus("error");
    } finally {
      setIsInteractiveSigningIn(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const res = await fetch("/api/auth/config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, getRedirectResult, onAuthStateChanged } = await import("firebase/auth");
        const auth = getAuth(app);
        if (!cancelled) {
          authRef.current = auth;
        }

        // 1. If already logged in, redirect immediately
        if (auth.currentUser) {
          safeSessionStorage.removeItem("redirect_sent");
          window.location.replace("/dashboard");
          return;
        }

        // 2. Subscribe to auth changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user && !cancelled) {
            safeSessionStorage.removeItem("redirect_sent");
            window.location.replace("/dashboard");
          }
        });

        // 3. Process redirect result if returning from a redirect
        try {
          const result = await getRedirectResult(auth);
          if (result?.user && !cancelled) {
            safeSessionStorage.removeItem("redirect_sent");
            window.location.replace("/dashboard");
            return;
          }
        } catch (redirectErr: any) {
          console.warn("[Login] Redirect result:", redirectErr);
        }

        if (!cancelled && !auth.currentUser) {
          const hasAttempted = sessionStorage.getItem("redirect_sent");
          if (hasAttempted) {
            sessionStorage.removeItem("redirect_sent");
            setStatus("error");
            setError("Unable to complete redirect sign-in. You can sign in directly below.");
          } else {
            sessionStorage.setItem("redirect_sent", "1");
            setStatus("redirecting");
            await signInWithRedirect(auth, new GoogleAuthProvider());
          }
        }

        return () => unsubscribe();
      } catch (err: any) {
        console.error("[Login] Init Error:", err);
        if (!cancelled) {
          setError(err?.message || "Authentication service unavailable.");
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
    <div className="relative flex w-full max-w-[390px] flex-col items-center justify-center border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-8 shadow-sm gap-6 text-center">
      <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
      <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
      <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
      <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

      {/* Brand Header */}
      <div className="flex items-center gap-2.5">
        <LogoMark size={28} className="text-[#9E5D48] dark:text-[#E07A5F]" />
        <span className="font-mono text-xl font-bold tracking-[0.18em] text-[#26211F] dark:text-[#F4F5F7] uppercase">
          {SITE_NAME}
        </span>
      </div>

      {/* Initializing Spinner */}
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DDD5CB] dark:border-[#25272E] border-t-[#9E5D48]" />
          <p className="font-mono text-xs text-[#9C9288] uppercase tracking-wider">Preparing sign-in…</p>
        </div>
      )}

      {/* Authenticating Spinner */}
      {status === "authenticating" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DDD5CB] dark:border-[#25272E] border-t-[#9E5D48]" />
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-semibold text-[#26211F] dark:text-[#F4F5F7] uppercase tracking-wide">
              Connecting to Google…
            </p>
            <p className="font-mono text-[11px] text-[#9C9288]">
              Completing secure authentication
            </p>
          </div>
        </div>
      )}

      {/* Ready / Interactive Action */}
      {status === "ready" && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="font-mono text-xs text-[#6D635C] dark:text-[#9BA1B0] leading-relaxed max-w-[280px]">
            Sign in with your Google account to access your personal dashboard.
          </p>

          <button
            onClick={() => handleGoogleSignIn()}
            className="flex items-center justify-center gap-2.5 w-full border border-[#DDD5CB] dark:border-[#25272E] bg-[#FFFFFF] dark:bg-[#121316] hover:bg-[#F3EFEA] dark:hover:bg-[#1E2025] hover:border-[#9E5D48] px-4 py-2.5 rounded-sm font-sans text-xs font-semibold text-[#26211F] dark:text-[#F4F5F7] transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <Link
            href="/"
            className="font-mono text-[11px] text-[#9C9288] hover:text-[#9E5D48] transition-colors uppercase tracking-wider pt-2"
          >
            ← Back to home
          </Link>
        </div>
      )}

      {/* Error View */}
      {status === "error" && (
        <div className="flex w-full flex-col items-center gap-4">
          {error && (
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-500 max-w-[320px]">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isInteractiveSigningIn}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-text-primary px-4 py-2.5 text-xs font-semibold text-bg-primary hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isInteractiveSigningIn ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-bg-primary border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{isInteractiveSigningIn ? "Signing in…" : "Sign in with Google"}</span>
          </button>

          <Link
            href="/"
            className="rounded-full border border-border-subtle bg-bg-primary px-4 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:border-border-hover transition-all"
          >
            ← Back to home
          </Link>
        </div>
      )}
    </div>
  );
}

