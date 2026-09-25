"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE_NAME, SITE_URL } from "@/lib/utils";
import { useOrigin } from "@/hooks/useOrigin";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { LogoMark } from "@/components/Logo";
import {
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Layers,
  Terminal,
  Cpu,
} from "lucide-react";

export default function PluginInstallationPage() {
  const router = useRouter();
  const { enableGPTMigration, loading } = useFeatureFlags();
  const origin = useOrigin();
  const [copiedKey, setCopiedKey] = useState<string>("");

  useEffect(() => {
    if (!loading && !enableGPTMigration) {
      router.replace("/assistant");
    }
  }, [enableGPTMigration, loading, router]);

  const effectiveOrigin = origin || SITE_URL;
  const mcpServerUrl = `${effectiveOrigin}/api/mcp`;
  const oauthAuthUrl = `${effectiveOrigin}/api/oauth/authorize`;
  const oauthTokenUrl = `${effectiveOrigin}/api/oauth/token`;
  const clientId = "chatgpt";

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? "" : prev)), 2000);
    } catch {
      // fallback
    }
  };

  if (loading || !enableGPTMigration) {
    return null;
  }

  const CARD = "rounded-sm border border-border-subtle bg-bg-card p-6 shadow-subtle";
  const CODE_BOX = "font-mono text-xs bg-bg-secondary border border-border-subtle rounded-xs px-2.5 py-1.5 text-text-primary break-all select-all";

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto flex max-w-[820px] flex-col gap-6 px-5 py-10 md:py-14">
        {/* Navigation / Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} color="var(--text-primary)" />
            <span className="text-[16px] font-semibold tracking-tight text-text-primary">
              {SITE_NAME}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-xs border border-border-subtle bg-bg-secondary text-text-muted">
              Plugins &amp; MCP
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/assistant"
              className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-medium text-text-secondary no-underline transition-all hover:bg-bg-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Integration Hub
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-medium text-text-secondary no-underline transition-all hover:bg-bg-secondary hover:text-text-primary"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Page Title & Hero */}
        <div>
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[1.4px] text-text-muted mb-2">
            Setup Guide &amp; Connector Reference
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl italic font-medium text-text-primary tracking-tight mb-3">
            Install ChatGPT Plugin &amp; MCP Connector
          </h1>
          <p className="text-[14px] leading-relaxed text-text-secondary max-w-[660px]">
            Connect your personal Continuum Home ledger, expense tracker, and watchlist directly to ChatGPT using the new Model Context Protocol (MCP) plugin architecture.
          </p>
        </div>

        {/* Official December 11 OpenAI Notice Banner */}
        <div className="rounded-sm border border-amber-500/40 bg-amber-500/5 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[1.2px] text-amber-600 dark:text-amber-400">
              OpenAI Policy Notice · Custom GPTs Retiring Dec 11, 2026
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            OpenAI has announced that legacy <strong>Custom GPTs will stop running on December 11, 2026</strong>. In their place, ChatGPT is transitioning to modular <strong>Plugins &amp; Apps (powered by MCP)</strong>.
            This new plugin allows you to access Continuum Home tools directly across all regular chats without needing to open a standalone GPT store link.
          </p>
        </div>

        {/* Quick Connection Details (Cards with 1-Click Copy) */}
        <div className={CARD}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1px] text-text-muted">
                Quick Parameters
              </span>
              <h2 className="font-serif text-xl italic font-medium text-text-primary mt-0.5">
                Plugin Connection Credentials
              </h2>
            </div>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-xs">
              Live &amp; Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Server URL */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xs border border-border-subtle bg-bg-primary/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  MCP Server URL (SSE)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("serverUrl", mcpServerUrl)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {copiedKey === "serverUrl" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
              <div className={CODE_BOX}>{mcpServerUrl}</div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Paste this into the &ldquo;Server URL&rdquo; field in ChatGPT.
              </p>
            </div>

            {/* Client ID */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xs border border-border-subtle bg-bg-primary/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Client ID
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard("clientId", clientId)}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {copiedKey === "clientId" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
              <div className={CODE_BOX}>{clientId}</div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Client ID configured in Continuum OAuth clients.
              </p>
            </div>

            {/* Authentication Mode */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xs border border-border-subtle bg-bg-primary/50">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Authentication
              </span>
              <div className={CODE_BOX}>OAuth (RFC 8414 Auto-Discovery)</div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Endpoints are auto-discovered from <span className="font-mono text-[10px]">/.well-known/oauth-authorization-server</span>.
              </p>
            </div>

            {/* Client Secret */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xs border border-border-subtle bg-bg-primary/50">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Client Secret
              </span>
              <div className={CODE_BOX}>Not Required (PKCE S256)</div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Leave blank or enter any placeholder (e.g. <span className="font-mono text-[10px]">continuum</span>).
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Installation Instructions */}
        <div className={CARD}>
          <div className="mb-6">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1px] text-text-muted">
              Step-by-Step
            </span>
            <h2 className="font-serif text-2xl italic font-medium text-text-primary mt-1">
              Installation Walkthrough
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-primary font-mono text-xs font-bold text-text-primary">
                1
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-base italic font-semibold text-text-primary">
                  Open ChatGPT Connected Apps / Developer Mode
                </h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  Navigate to <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" className="underline text-text-primary hover:text-text-muted">chatgpt.com</a>. Click your profile avatar in the bottom-left corner &rarr; <strong>Settings</strong> &rarr; <strong>Connected Apps</strong> (or <strong>Developer Mode</strong>). Click <strong>Add App</strong> (or <strong>New App</strong>).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-primary font-mono text-xs font-bold text-text-primary">
                2
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-base italic font-semibold text-text-primary">
                  Fill in Connector Details
                </h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  Complete the fields in the New App dialog:
                </p>
                <ul className="text-[12.5px] text-text-secondary list-disc pl-5 space-y-1">
                  <li><strong>Name:</strong> <span className="font-mono text-xs text-text-primary">Continuum Home</span></li>
                  <li><strong>Connection:</strong> Select <strong>Server URL</strong></li>
                  <li><strong>Server URL:</strong> Paste <span className="font-mono text-xs text-text-primary">{mcpServerUrl}</span></li>
                  <li><strong>Authentication:</strong> Select <strong>OAuth</strong></li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-primary font-mono text-xs font-bold text-text-primary">
                3
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-base italic font-semibold text-text-primary">
                  Review Discovered OAuth Settings
                </h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  ChatGPT will ping your server and automatically discover the OAuth configuration. In <strong>Advanced OAuth Settings</strong>, verify that:
                </p>
                <ul className="text-[12.5px] text-text-secondary list-disc pl-5 space-y-1">
                  <li><strong>Client ID:</strong> <span className="font-mono text-xs text-text-primary">chatgpt</span></li>
                  <li><strong>Authorization URL:</strong> <span className="font-mono text-xs">{oauthAuthUrl}</span></li>
                  <li><strong>Token URL:</strong> <span className="font-mono text-xs">{oauthTokenUrl}</span></li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-primary font-mono text-xs font-bold text-text-primary">
                4
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-base italic font-semibold text-text-primary">
                  Authorize &amp; Connect Your Workspace
                </h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  Check the consent checkbox (<em>&ldquo;I understand and want to continue&rdquo;</em>) and click <strong>Create</strong>. Next, click <strong>Authorize / Connect</strong> to open the Continuum login window, sign in to your Google account, and grant access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Included in the Plugin */}
        <div className={CARD}>
          <div className="mb-4">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1px] text-text-muted">
              Capabilities
            </span>
            <h2 className="font-serif text-xl italic font-medium text-text-primary mt-0.5">
              Available Tools in the Continuum Plugin
            </h2>
            <p className="text-[13px] text-text-secondary mt-1">
              Once connected, ChatGPT can run any of these actions seamlessly on your behalf:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "list_expenses", desc: "Search & filter expenses by category, date range, or keywords." },
              { name: "create_expense", desc: "Log single or split transactions with auto-categorization." },
              { name: "delete_expense", desc: "Remove an expense entry by its unique transaction ID." },
              { name: "list_watchlist", desc: "Browse movies, TV series, anime, and reading lists." },
              { name: "add_watchlist_item", desc: "Add media with status (plan to watch, completed, etc.)." },
              { name: "update_watchlist_item", desc: "Update episode progress, scores, or review notes." },
              { name: "list_subscriptions", desc: "Monitor active recurring subscriptions and billing cycles." },
              { name: "create_subscription", desc: "Add new subscriptions with cost and billing interval." },
              { name: "get_portfolio", desc: "Fetch investment asset allocation and performance summary." },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex flex-col gap-1 p-3 rounded-xs border border-border-subtle bg-bg-primary/40"
              >
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-text-muted" />
                  <span className="font-mono text-xs font-semibold text-text-primary">
                    {tool.name}
                  </span>
                </div>
                <p className="text-[11.5px] text-text-secondary leading-snug">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison / Migration Strategy */}
        <div className="rounded-sm border border-border-subtle bg-bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-text-primary" />
            <h3 className="font-serif text-lg italic font-medium text-text-primary">
              No External Setup Required: In-App Assistant
            </h3>
          </div>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            Remember that you don&apos;t have to rely on ChatGPT store policies to talk to your workspace. Continuum Home includes a fully autonomous in-app assistant (powered by Gemini and OpenAI) available directly on your dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-text-primary bg-text-primary px-4 py-2 font-mono text-xs uppercase tracking-wider font-semibold text-bg-primary transition-all hover:opacity-90"
            >
              Open In-App Assistant
            </Link>
            <a
              href="https://chatgpt.com/g/g-6a60b01e38c8819187662d1e42c6bee7-Continuum-dashboard-public"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-border-subtle bg-bg-secondary px-4 py-2 font-mono text-xs uppercase tracking-wider font-medium text-text-secondary hover:text-text-primary transition-all"
            >
              <span>Legacy GPT Link (Dec 11)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
