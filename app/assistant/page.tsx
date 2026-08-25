"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Auth, GoogleAuthProvider as GoogleAuthProviderClass, signInWithPopup as signInWithPopupFn } from "firebase/auth";
import { SITE_URL, SITE_NAME } from "@/lib/utils";
import { useOrigin } from "@/hooks/useOrigin";
import { LogoMark } from "@/components/Logo";

interface AgentUser {
  displayName: string | null;
  email: string;
  idToken: string;
}

interface AuthApi {
  auth: Auth;
  GoogleAuthProvider: typeof GoogleAuthProviderClass;
  signInWithPopup: typeof signInWithPopupFn;
}

export default function AssistantIntegrationPage() {
  const [authApi, setAuthApi] = useState<AuthApi | null>(null);
  const [user, setUser] = useState<AgentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const origin = useOrigin();
  const [copied, setCopied] = useState<string>("");
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const res = await fetch("/api/auth/config");
        if (!res.ok) throw new Error("Could not load Firebase configuration.");
        const config = await res.json();

        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } = await import("firebase/auth");

        const appName = "dashboard-client";
        const apps = getApps();
        const app = apps.find((a) => a.name === appName) || initializeApp(config, appName);
        const auth = getAuth(app);
        setAuthApi({ auth, GoogleAuthProvider, signInWithPopup });

        unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            const idToken = await fbUser.getIdToken();
            setUser({ displayName: fbUser.displayName, email: fbUser.email || "", idToken });
          } else {
            setUser(null);
          }
          setAuthLoading(false);
        });
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Could not load Firebase configuration.");
        setAuthLoading(false);
      }
    })();

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const schemaUrl = `${origin || SITE_URL}/api/openapi.json`;
  const poeWebhookUrl = `${origin || SITE_URL}/api/assistant/poe?key=${
    authApi?.auth?.currentUser?.refreshToken || "YOUR_PERMANENT_API_KEY"
  }`;

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((prev) => (prev === key ? "" : prev)), 2500);
    } catch {
      setAuthError("Clipboard access was blocked — copy manually instead.");
    }
  }

  async function copyToken() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const token = await authApi.auth.currentUser.getIdToken(true);
      await copyText("token", token);
    } catch {
      setAuthError("Could not refresh the token. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function copyPermanentKey() {
    if (!authApi?.auth?.currentUser) return;
    setTokenBusy(true);
    try {
      const key = authApi.auth.currentUser.refreshToken;
      await copyText("perm_key", key);
    } catch {
      setAuthError("Could not retrieve key. Try signing in again.");
    } finally {
      setTokenBusy(false);
    }
  }

  async function signIn() {
    if (!authApi) return;
    try {
      await authApi.signInWithPopup(authApi.auth, new authApi.GoogleAuthProvider());
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    }
  }

  const agentInstructions = `You are my personal dashboard assistant. You manage two things through the API actions:

1. Expenses — when I mention spending money ("spent 450 on lunch", "uber was 320"), log it with createExpense. Infer a sensible category (Food, Transport, Rent, Shopping, Entertainment, Health, Other) and reuse existing ones from listExpenseCategories when they fit. Amounts are INR. Use today's date unless I say otherwise. When I ask about my spending, use listExpenses with filters and summarise clearly.

2. Watchlist — when I mention wanting to watch something, add it with addWatchlistItem (status plan_to_watch). Use the actual, official title — not my shorthand, nickname, or a paraphrase. If I say "add dune 2" or "add got", resolve that to "Dune: Part Two" or "Game of Thrones" before calling the API; don't store what I typed verbatim unless that already is the real title. ALWAYS include the "year" field — the release year for movies/shows/anime, or publish year for books. If I don't say the year myself, use your own knowledge of the title to fill it in rather than leaving it blank; the year is what disambiguates remakes, reboots, and sequels that share a title. When I say I watched/finished episodes, update progress or status with updateWatchlistItem — look up the item id via listWatchlistItems first. Ratings are out of 10.

Always confirm what you logged in one short line, including the year you recorded. Never invent ids — fetch them first.`;

  const examplePrompts = [
    "Log 450 for lunch at the office cafe",
    "I spent 1,200 on groceries and 300 on an auto today",
    "How much did I spend on food this month?",
    "Add Dune: Part Two to my watchlist",
    "I just finished episode 8 of Frieren — update it",
    "What am I currently watching?",
  ];

  // ── Reusable style atoms ──────────────────────────────────────────────────
  const CARD = "rounded-[10px] border border-border-subtle bg-bg-card p-6 shadow-[0_2px_10px_-2px_rgba(110,108,100,0.05)]";
  const CODE = "rounded-[5px] bg-bg-secondary px-[7px] py-0.5 font-mono text-xs break-all";
  const BTN_PRIMARY = "inline-flex items-center justify-center rounded-md border border-text-primary bg-text-primary px-4 py-2.5 text-[12.5px] font-medium text-white no-underline transition-all duration-200 hover:bg-[#2e2d27] hover:border-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-40";
  const BTN_GHOST = "inline-flex items-center justify-center rounded-md border border-border-subtle bg-transparent px-4 py-2.5 text-[12.5px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40";

  const renderStep = (n: number) => (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-primary font-mono text-[11px] font-bold text-text-secondary">
      {n}
    </span>
  );


  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto flex max-w-[780px] flex-col gap-6 px-5 py-10 md:py-14">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} color="var(--text-primary)" />
            <span className="text-[15px] font-semibold tracking-tight text-text-primary">{SITE_NAME}</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-text-secondary no-underline transition-all hover:text-text-primary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to dashboard
          </Link>
        </div>

        {/* ── Page title ─────────────────────────────────────────── */}
        <div className="border-b border-border-subtle pb-6">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[1.2px] text-text-muted mb-2">Integration guide</p>
          <h1 className="font-serif text-[28px] italic font-medium text-text-primary leading-tight mb-2">
            Connect a Custom GPT
          </h1>
          <p className="text-[13px] leading-[1.7] text-text-secondary max-w-[560px]">
            Link your dashboard to a Custom GPT on the GPT Store, or wire it up to any AI agent platform that supports OpenAPI schemas.
          </p>
        </div>

        {authError && (
          <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[12.5px] text-[#b3666b]">
            {authError}
          </div>
        )}

        {/* ── Recommended: Public GPT ────────────────────────────── */}
        <div className={CARD}>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted">Recommended</span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted">·</span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted">Easiest</span>
          </div>
          <h2 className="font-serif text-[18px] italic font-medium text-text-primary mb-2 leading-snug">
            Use the Official Public Custom GPT
          </h2>
          <p className="text-[13px] leading-[1.7] text-text-secondary mb-5">
            Connect to the pre-built <strong className="font-semibold text-text-primary">Continuum Assistant</strong> on the GPT Store.
            It uses secure OAuth 2.0 — no copy-pasting API keys required.
          </p>
          <a
            href="https://chatgpt.com/g/g-6a60b01e38c8819187662d1e42c6bee7-Continuum-dashboard-public"
            target="_blank"Continuum-Home
            rel="noopener noreferrer"
            className={BTN_PRIMARY}
          >
            Open in ChatGPT
          </a>
        </div>

        {/* ── Divider ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 border-t border-border-subtle" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[1.5px] text-text-muted">
            Or Self-Host / Custom Agent
          </span>
          <div className="flex-1 border-t border-border-subtle" />
        </div>

        {/* ── Step 1 ─────────────────────────────────────────────── */}
        <div className={`${CARD} flex gap-4`}>
          {renderStep(1)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Create a Custom GPT or AI Agent</h2>
            <p className="text-[13px] leading-[1.7] text-text-secondary">
              In ChatGPT (under Explore GPTs) or your preferred AI Agent builder (e.g. Coze, Dify), initiate a new custom assistant.
              Keep sharing set to <strong className="text-text-primary">Only me</strong> — this agent will hold a token to your personal data.
            </p>
          </div>
        </div>

        {/* ── Step 2 ─────────────────────────────────────────────── */}
        <div className={`${CARD} flex gap-4`}>
          {renderStep(2)}
          <div className="min-w-0 flex-1 flex flex-col gap-4">
            <div>
              <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Import the API schema</h2>
              <p className="text-[13px] leading-[1.7] text-text-secondary">
                For <strong className="text-text-primary">ChatGPT Actions</strong> (Custom GPTs) or agent platforms,
                choose to import a schema from a URL and paste the link below:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={CODE}>{schemaUrl}</span>
              <button onClick={() => copyText("schema", schemaUrl)} className={`${BTN_GHOST} py-1.5 text-xs`}>
                {copied === "schema" ? "✓ Copied" : "Copy URL"}
              </button>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
                For <strong className="text-text-primary">Poe Server Bots</strong>, copy the Server Webhook URL and paste it in Poe's Server URL settings:
              </p>
              {user ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className={CODE}>{poeWebhookUrl}</span>
                  <button onClick={() => copyText("poe", poeWebhookUrl)} className={`${BTN_GHOST} py-1.5 text-xs`}>
                    {copied === "poe" ? "✓ Copied" : "Copy Poe URL"}
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-text-muted italic">Sign in to view your Poe webhook URL.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Step 3 ─────────────────────────────────────────────── */}
        <div className={`${CARD} flex gap-4`}>
          {renderStep(3)}
          <div className="min-w-0 flex-1 flex flex-col gap-4">
            <div>
              <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Authenticate your Agent</h2>
              <p className="text-[13px] leading-[1.7] text-text-secondary">
                Configure how the custom assistant authenticates with your dashboard:
              </p>
            </div>

            {/* Option A: OAuth */}
            <div className="rounded-[8px] border border-border-subtle bg-bg-primary p-4 flex flex-col gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted mb-1">Option A</p>
                <h3 className="text-[13px] font-semibold text-text-primary">OAuth 2.0 (Recommended)</h3>
              </div>
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Under Authentication, select <strong className="text-text-primary">OAuth</strong> and configure:
              </p>
              <table className="w-full text-[11px] font-mono text-text-secondary border-collapse">
                <tbody>
                  <tr>
                    <td className="pr-4 pb-1.5 font-semibold text-text-primary whitespace-nowrap">Auth URL</td>
                    <td className="pb-1.5 break-all">{origin || SITE_URL}/api/oauth/authorize</td>
                  </tr>
                  <tr>
                    <td className="pr-4 font-semibold text-text-primary whitespace-nowrap">Token URL</td>
                    <td className="break-all">{origin || SITE_URL}/api/oauth/token</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Option B: API Key — Pro gated */}
            <div className="rounded-[8px] border border-border-subtle bg-bg-primary p-4 flex flex-col gap-3">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted mb-1">Option B</p>
                <h3 className="text-[13px] font-semibold text-text-primary">Permanent API Key</h3>
              </div>
              <p className="text-[12px] leading-relaxed text-text-secondary">
                Under Authentication, select <strong className="text-text-primary">API Key → Bearer</strong>, then paste your key.
              </p>

              {authLoading ? (
                <p className="text-[12px] text-text-muted italic">Checking sign-in…</p>
              ) : !user ? (
                <button onClick={signIn} disabled={!authApi} className={`${BTN_PRIMARY} w-fit text-xs`}>
                  Sign in to retrieve API Key
                </button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-[12px] text-text-secondary">
                    Signed in as <strong className="text-text-primary">{user.displayName || user.email}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={copyPermanentKey} disabled={tokenBusy} className={`${BTN_PRIMARY} text-xs py-1.5`}>
                      {tokenBusy ? "Generating…" : copied === "perm_key" ? "✓ Copied" : "Copy Permanent API Key"}
                    </button>
                    <button onClick={copyToken} disabled={tokenBusy} className={`${BTN_GHOST} text-xs py-1.5`}>
                      {tokenBusy ? "Generating…" : copied === "token" ? "✓ Token Copied" : "Copy 1-Hour ID Token"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Step 4 ─────────────────────────────────────────────── */}
        <div className={`${CARD} flex gap-4`}>
          {renderStep(4)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Teach the Agent how to behave</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Paste this into the agent's <strong className="text-text-primary">Instructions</strong> or <strong className="text-text-primary">System Instructions</strong> field:
            </p>
            <pre className="max-h-64 overflow-y-auto rounded-[8px] bg-bg-secondary p-4 font-mono text-[11px] leading-[1.7] whitespace-pre-wrap break-words text-text-primary">
              {agentInstructions}
            </pre>
            <button onClick={() => copyText("instructions", agentInstructions)} className={`${BTN_GHOST} mt-3 text-xs py-1.5`}>
              {copied === "instructions" ? "✓ Copied" : "Copy instructions"}
            </button>
          </div>
        </div>

        {/* ── Step 5 ─────────────────────────────────────────────── */}
        <div className={`${CARD} flex gap-4`}>
          {renderStep(5)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Try it out</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Save the agent and start chatting. Things that should just work:
            </p>
            <div className="flex flex-col gap-1.5">
              {examplePrompts.map((prompt) => (
                <div key={prompt} className="rounded-[6px] bg-bg-secondary px-3.5 py-2 text-[12.5px] text-text-secondary">
                  &ldquo;{prompt}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Self-hosting note ──────────────────────────────────── */}
        <div className={CARD}>
          <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted">Self-hosting?</p>
          <p className="text-[13px] leading-[1.7] text-text-secondary">
            Deploy with your own <span className={CODE}>FIREBASE_CONFIG</span> environment variable and publish the matching
            Firestore security rules from <span className={CODE}>firestore.rules</span>. Follow the same steps above against
            your own domain — the schema URL adapts automatically.
          </p>
        </div>

        <p className="pb-6 text-center text-[11px] text-text-muted">
          Raw schema at{" "}
          <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="text-text-secondary underline">
            /api/openapi.json
          </a>
        </p>

      </div>
    </div>
  );
}
