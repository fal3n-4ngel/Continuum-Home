"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

export default function LoginPage() {
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

        // 1. If already signed in, go home immediately
        if (auth.currentUser) {
          window.location.replace("/");
          return;
        }

        // 2. Listen for auth state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user && !cancelled) {
            sessionStorage.removeItem("redirect_sent");
            window.location.replace("/");
          }
        });

        // 3. Process redirect result if coming back from Google
        try {
          const result = await getRedirectResult(auth);
          if (result?.user && !cancelled) {
            sessionStorage.removeItem("redirect_sent");
            window.location.replace("/");
            return;
          }
        } catch (redirectErr: any) {
          console.warn("[Login] Redirect result error:", redirectErr);
        }

        // 4. If not logged in after checking, determine whether to redirect or stop loop
        if (!cancelled && !auth.currentUser) {
          const hasAttempted = sessionStorage.getItem("redirect_sent");
          if (hasAttempted) {
            // Already attempted redirect once and came back unauthenticated -> stop loop!
            sessionStorage.removeItem("redirect_sent");
            setStatus("error");
            setError("Unable to complete sign-in. Please try again from the main page.");
          } else {
            // First time on /login -> initiate redirect
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
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4f3ec",
        gap: "24px",
        padding: "24px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <LogoMark size={28} className="text-text-primary" />
        <span style={{ fontSize: "18px", fontWeight: 600, color: "#1c1b18", letterSpacing: "-0.5px" }}>
          {SITE_NAME}
        </span>
      </div>

      {status === "loading" && (
        <p style={{ fontSize: "13px", color: "#6e6c64" }}>Preparing sign-in…</p>
      )}

      {status === "redirecting" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "22px",
              height: "22px",
              border: "2px solid #e5e3db",
              borderTopColor: "#1c1b18",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: "13px", color: "#6e6c64", margin: 0 }}>
            Redirecting to Google…
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", maxWidth: "340px" }}>
          <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>{error}</p>
          <a
            href="/"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#1c1b18",
              textDecoration: "none",
              borderBottom: "1px solid #1c1b18",
            }}
          >
            ← Back to home
          </a>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
