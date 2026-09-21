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

        const app = getApps().length ? getApps()[0] : initializeApp(config);
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

  const agentInstructions = `Role and Purpose
You are the Continuum Assistant, an AI agent designed to help the user manage their finances, investments, subscriptions, and media watchlist. You are connected to the user's Continuum dashboard via an OpenAPI schema. Your goal is to seamlessly translate the user's natural language requests into API calls to track their life accurately.

Core Capabilities & API Mapping
You have access to several REST API endpoints. Use the following logic to determine which endpoint to call — but always defer to the actual operationId/schema in your imported Actions if anything here seems out of date.

1. Expenses (/api/expenses)
Logging: When the user says "I spent $20 on lunch" or "Log a $5 coffee expense", call the expense-creation action with title, amount, and category. Log incomes as negative (e.g. -100) so they net out correctly.
Listing/Analytics: If the user asks "How much did I spend this month?", list expenses (optionally filtered by from/to date) and sum the amounts yourself — there is no separate stats endpoint.
Modifying: If the user corrects an expense ("Change that lunch to $25"), patch that expense by id.
Deleting: If the user says "Delete that coffee expense", delete it by id.

2. Portfolio & Investments (/api/portfolio)
Categories: equity, crypto, mutual_fund, sip, gold, cash, fixed_deposit, other.
Buying/Adding: When the user says "I bought 10 shares of AAPL at $150", add a new asset with name, category, amount (current value), investedAmount (cost basis), quantity, and buyPrice.
  - For category "sip": quantity is the recurring installment amount in the user's currency, NOT a unit count — do not treat it as units held. amount is the total current valuation, which the user updates periodically; don't try to derive it by multiplying quantity by a price. If they give you a scheme name (e.g. "HDFC Mid Cap"), you may look it up via the portfolio symbol-search action to get an mfSchemeCode for live NAV tracking, plus optional startDate and sipDay (1-31, the debit day).
  - For category "fixed_deposit": use interestRate (annual %), startDate, maturityDate, and compounding (monthly/quarterly/half_yearly/yearly) instead of quantity/buyPrice.
Updating: If the user says "Update my AAPL average buy price to $145", patch that asset by id with the changed field(s) only.
Selling: If the user says "I sold my AAPL stock for $160", patch that asset by id and set isSold: true, soldPrice: 160, soldAt: <current time in ms>, and amount: 0. Sold assets are excluded from portfolio totals but stay visible in sold history — do not delete them.
Deleting: If the user says "Remove AAPL from my portfolio entirely" (not sold, just erased from records), delete it by id.
Note: there's also a full-replace action that overwrites the entire asset list at once — only use it for bulk operations, and always resend every existing field on every asset (including isSold/soldAt/soldPrice) since it's a full replace, not a patch. Prefer the single-asset patch/delete actions for anything about one holding.

3. Subscriptions (/api/subscriptions)
Tracking: For "Add my $15/month Netflix subscription", create a subscription with billingCycle: "monthly" and a nextBillingDate.
Updating/Canceling: Patch or delete it by id respectively.

4. Watchlist (/api/watchlist)
Adding Media: For "Add Inception to my watchlist", add an item with type: "movie" and status: "plan_to_watch".
Updating Progress: For "I finished season 1 of Breaking Bad", patch that item's progress or status (e.g. to "completed") by id.
Valid types: movie, show, anime, book. Valid statuses: plan_to_watch, watching, completed, dropped, paused.

Behavioral Guidelines
Be Concise and Action-Oriented: Do not give long-winded explanations. If the user asks you to log an expense, make the API call and confirm it briefly: "Logged $20 for Lunch."
Ask for Missing Context: If the user says "I bought TSLA" but doesn't provide the amount or buy price, politely ask for the missing details before making the API call.
Handle Errors Gracefully: If an API call fails, read the error message returned by the API and explain to the user what went wrong.
Confirm Destructive Actions: If the user asks to delete a major investment or wipe multiple records, ask for a quick confirmation before firing the delete action.`;

  const examplePrompts = [
    "Log 450 for lunch at the office cafe",
    "I spent 1,200 on groceries and 300 on an auto today",
    "How much did I spend on food this month?",
    "I bought 10 shares of AAPL at $150",
    "Add my $15/month Netflix subscription",
    "Add Dune: Part Two to my watchlist",
    "I just finished episode 8 of Frieren — update it",
    "What am I currently watching?",
  ];

  const CARD = "rounded-sm border border-border-subtle bg-bg-card p-6 shadow-subtle";
  const CODE = "rounded-xs border border-border-subtle bg-bg-secondary px-2 py-0.5 font-mono text-xs text-text-primary break-all";
  const BTN_PRIMARY = "inline-flex items-center justify-center rounded-sm border border-text-primary bg-text-primary px-4 py-2 text-xs font-mono uppercase tracking-wider font-semibold text-bg-primary no-underline transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";
  const BTN_GHOST = "inline-flex items-center justify-center rounded-sm border border-border-subtle bg-transparent px-4 py-2 text-xs font-mono uppercase tracking-wider font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";

  const renderStep = (n: number) => (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-primary font-mono text-[11px] font-bold text-text-secondary">
      {n}
    </span>
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto flex max-w-[780px] flex-col gap-6 px-5 py-10 md:py-14">

        <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
          <div className="flex items-center gap-2.5">
            <LogoMark size={20} color="var(--text-primary)" />
            <span className="text-[15px] font-semibold tracking-tight text-text-primary">{SITE_NAME}</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-medium text-text-secondary no-underline transition-all hover:bg-bg-secondary hover:text-text-primary"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to dashboard
          </Link>
        </div>

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
          <div className="rounded-sm border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12.5px] text-rose-600 dark:text-rose-400">
            {authError}
          </div>
        )}

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
            target="_blank"
            rel="noopener noreferrer"
            className={BTN_PRIMARY}
          >
            Open in ChatGPT
          </a>
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 border-t border-border-subtle" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[1.5px] text-text-muted">
            Or Self-Host / Custom Agent
          </span>
          <div className="flex-1 border-t border-border-subtle" />
        </div>

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

        <div className={`${CARD} flex gap-4`}>
          {renderStep(3)}
          <div className="min-w-0 flex-1 flex flex-col gap-4">
            <div>
              <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Authenticate your Agent</h2>
              <p className="text-[13px] leading-[1.7] text-text-secondary">
                Configure how the custom assistant authenticates with your dashboard:
              </p>
            </div>

            <div className="rounded-sm border border-border-subtle bg-bg-primary p-4 flex flex-col gap-3">
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

            <div className="rounded-sm border border-border-subtle bg-bg-primary p-4 flex flex-col gap-3">
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

        <div className={`${CARD} flex gap-4`}>
          {renderStep(4)}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-text-primary">Teach the Agent how to behave</h2>
              <a
                href="https://github.com/fal3n-4ngel/Continuum-Home/blob/main/docs/custom-agent-instructions.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-text-muted transition-colors hover:text-accent no-underline"
              >
                docs/custom-agent-instructions.md ↗
              </a>
            </div>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Paste this into the agent&apos;s <strong className="text-text-primary">Instructions</strong> or <strong className="text-text-primary">System Instructions</strong> field:
            </p>
            <pre className="max-h-64 overflow-y-auto rounded-sm bg-bg-secondary p-4 font-mono text-[11px] leading-[1.7] whitespace-pre-wrap break-words text-text-primary">
              {agentInstructions}
            </pre>
            <button onClick={() => copyText("instructions", agentInstructions)} className={`${BTN_GHOST} mt-3 text-xs py-1.5`}>
              {copied === "instructions" ? "✓ Copied" : "Copy instructions"}
            </button>
          </div>
        </div>

        <div className={`${CARD} flex gap-4`}>
          {renderStep(5)}
          <div className="min-w-0 flex-1">
            <h2 className="mb-2 text-[14px] font-semibold text-text-primary">Try it out</h2>
            <p className="mb-3 text-[13px] leading-[1.7] text-text-secondary">
              Save the agent and start chatting. Things that should just work:
            </p>
            <div className="flex flex-col gap-1.5">
              {examplePrompts.map((prompt) => (
                <div key={prompt} className="rounded-sm bg-bg-secondary px-3.5 py-2 text-[12.5px] text-text-secondary">
                  &ldquo;{prompt}&rdquo;
                </div>
              ))}
            </div>
          </div>
        </div>

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
