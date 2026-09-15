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
    <div className="relative flex w-full max-w-[380px] flex-col items-center justify-center border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-8 shadow-sm gap-6 text-center">
      <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
      <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
      <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
      <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

      <div className="flex items-center gap-2.5">
        <LogoMark size={28} className="text-[#9E5D48] dark:text-[#E07A5F]" />
        <span className="font-mono text-xl font-bold tracking-[0.18em] text-[#26211F] dark:text-[#F4F5F7] uppercase">
          {SITE_NAME}
        </span>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DDD5CB] dark:border-[#25272E] border-t-[#9E5D48]" />
          <p className="font-mono text-xs text-[#9C9288] uppercase tracking-wider">Preparing sign-in…</p>
        </div>
      )}

      {status === "redirecting" && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DDD5CB] dark:border-[#25272E] border-t-[#9E5D48]" />
          <div className="flex flex-col gap-1">
            <p className="font-mono text-sm font-semibold text-[#26211F] dark:text-[#F4F5F7] uppercase tracking-wide">
              Redirecting to Google…
            </p>
            <p className="font-mono text-xs text-[#9C9288]">
              Completing secure authentication
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-4">
          <p className="font-mono text-xs text-rose-500 max-w-[320px]">{error}</p>
          <Link
            href="/"
            className="border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-4 py-2 font-mono text-xs font-semibold text-[#26211F] dark:text-[#F4F5F7] hover:border-[#9E5D48] transition-all uppercase"
          >
            ← Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
