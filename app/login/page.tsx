"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

export default function LoginPage() {
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function doRedirect() {
      try {
        const { initializeApp, getApps } = await import("firebase/app");
        const res = await fetch("/api/auth/config");
        const config = await res.json();
        const app = getApps().length ? getApps()[0] : initializeApp(config);

        const { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } =
          await import("firebase/auth");
        const auth = getAuth(app);

        // Check if we're returning from a redirect first
        const result = await getRedirectResult(auth);
        if (result?.user) {
          // Redirect completed — go back to the main app
          window.location.replace("/");
          return;
        }

        if (cancelled) return;
        setStatus("redirecting");

        // Initiate the redirect sign-in
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } catch (err: any) {
        console.error("[Login] Error:", err);
        if (!cancelled) {
          setError(err?.message || "Sign-in failed. Please try again.");
          setStatus("error");
        }
      }
    }

    doRedirect();
    return () => { cancelled = true; };
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
