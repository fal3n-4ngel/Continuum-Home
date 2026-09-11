"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FirebaseUser, ProClaim } from "@/types";
import { getAuthHeaders } from "@/lib/utils";
import {
  Shield,
  Trash2,
  Bell,
  Mail,
  RefreshCw,
  AlertTriangle,
  Server,
  TerminalSquare,
  Users,
  Activity,
  Zap,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Database,
  Radio,
  Cpu,
  Clock,
  Layers,
  Sparkles,
  Bot
} from "lucide-react";
import { ProClaimsQueue } from "./ProClaimsQueue";
import { CronTriggerSection } from "./CronTriggerSection";
import { ReleaseNotesModal } from "@/components/modals";

interface AdminTabProps {
  user: FirebaseUser;
}

export function AdminTab({ user }: AdminTabProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "communications" | "system" | "pro-requests">("overview");

  const [stats, setStats] = useState<{
    expenses: number;
    subscriptions: number;
    watchlist: number;
    portfolioAssets: number;
    portfolioValue: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [flushLoading, setFlushLoading] = useState(false);
  const [pruneLoading, setPruneLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ id: string; title: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const [proClaims, setProClaims] = useState<ProClaim[]>([]);
  const [proClaimsLoading, setProClaimsLoading] = useState(false);
  const [proClaimsFilter, setProClaimsFilter] = useState<"pending" | "approved" | "denied" | "all">("pending");
  const [proActionLoading, setProActionLoading] = useState<string | null>(null);

  const [annSubject, setAnnSubject] = useState("Rebranding Notice: PHub is now Continuum");
  const [annTitle, setAnnTitle] = useState("PHub has officially rebranded to Continuum");
  const [annContent, setAnnContent] = useState(`We are excited to share that PHub has officially rebranded to Continuum.

Our new name represents a smooth, steady flow of life progression. Everything you love about the platform — tracking your expenses, library items, subscription cycles, and financial portfolio — remains completely unchanged and secure under AES-256-GCM encryption.

Key Updates:
• New domain: continuum-home.vercel.app
• Refined warm paper aesthetics and dynamic layouts
• Fully-loaded data guarantees at launch to prevent layout shifts
• Native Custom GPT integrations for automated ledger management

Thank you for being part of our journey!`);
  const [annSending, setAnnSending] = useState<"preview" | "send" | null>(null);
  const [annConfirmModal, setAnnConfirmModal] = useState(false);

  const [relVersion, setRelVersion] = useState("v1.3.0");
  const [relTitle, setRelTitle] = useState("Historical Analytics & In-App Release Notes");
  const [relContent, setRelContent] = useState(`### What's New
- **Historical Cycle Analytics**: Deep-dive historical spend evolution, 100% stacked category distribution, and adherence benchmarks.
- **Privacy First Controls**: Deterministic local financial computations with full AI opt-out capability.
- **In-App Release Notes**: Automatically stay informed with release summaries delivered once upon opening the app.`);
  const [relPublishing, setRelPublishing] = useState(false);
  const [relGenerating, setRelGenerating] = useState(false);
  const [showRelPreviewModal, setShowRelPreviewModal] = useState(false);
  const [activeReleaseNote, setActiveReleaseNote] = useState<{
    id: string;
    version: string;
    title: string;
    content?: string;
    publishedAt: number;
    active: boolean;
  } | null>(null);

  const [discordMsg, setDiscordMsg] = useState("");
  const [discordSending, setDiscordSending] = useState(false);

  const handleDiscordSend = async () => {
    setDiscordSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/discord", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: discordMsg }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: "Discord alert dispatched successfully!", type: "success" });
        setDiscordMsg("");
      } else {
        setStatusMessage({ text: data.error || "Failed to dispatch Discord alert.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Network error occurred while dispatching Discord alert.", type: "error" });
    } finally {
      setDiscordSending(false);
    }
  };

  const handleQuickDiscordPing = async () => {
    setDiscordSending(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/discord", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ message: "Admin Health Ping: Continuum operational check dispatched from Admin Control Hub." }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: "Discord health alert dispatched successfully!", type: "success" });
      } else {
        setStatusMessage({ text: data.error || "Failed to dispatch Discord ping.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Network error occurred while pinging Discord.", type: "error" });
    } finally {
      setDiscordSending(false);
    }
  };

  const handlePruneLegacy = async () => {
    setPruneLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/cleanup-legacy", {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          text: data.message || `Pruned ${data.deletedCount} legacy document(s) successfully.`,
          type: "success",
        });
      } else {
        setStatusMessage({ text: data.error || "Failed to prune legacy collections.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setPruneLoading(false);
    }
  };

  const handleAnnouncement = async (action: "preview" | "send") => {
    if (action === "send") {
      setAnnConfirmModal(false);
    }
    setAnnSending(action);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action,
          subject: annSubject,
          title: annTitle,
          content: annContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          text: action === "preview"
            ? `Preview sent successfully to admin.`
            : `Announcement broadcast sent successfully! Details: Success: ${data.details?.success}, Failed: ${data.details?.failed}`,
          type: "success",
        });
        if (action === "send") {
          setAnnSubject("");
          setAnnTitle("");
          setAnnContent("");
        }
      } else {
        setStatusMessage({ text: data.error || "Failed to process announcement.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setAnnSending(null);
    }
  };

  const getHeaders = () => getAuthHeaders(user.idToken);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const headers = getHeaders();
      const [expRes, subRes, watchRes, portRes] = await Promise.all([
        fetch("/api/expenses", { headers }),
        fetch("/api/subscriptions", { headers }),
        fetch("/api/watchlist", { headers }),
        fetch("/api/portfolio", { headers }),
      ]);

      const expenses = expRes.ok ? await expRes.json() : [];
      const subscriptions = subRes.ok ? await subRes.json() : [];
      const watchlist = watchRes.ok ? await watchRes.json() : [];
      const portfolio = portRes.ok ? await portRes.json() : null;

      const portAssets = Array.isArray(portfolio)
        ? portfolio
        : (portfolio && Array.isArray(portfolio.assets) ? portfolio.assets : []);

      const portValue = portAssets.reduce((sum: number, asset: any) => sum + (Number(asset.amount) || 0), 0);

      setStats({
        expenses: Array.isArray(expenses) ? expenses.length : 0,
        subscriptions: Array.isArray(subscriptions) ? subscriptions.length : 0,
        watchlist: Array.isArray(watchlist) ? watchlist.length : (watchlist.items ? watchlist.items.length : 0),
        portfolioAssets: portAssets.length,
        portfolioValue: portValue,
      });
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProClaims = async (filter = proClaimsFilter) => {
    setProClaimsLoading(true);
    try {
      const res = await fetch(`/api/admin/pro-requests?status=${filter}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setProClaims(data.claims || []);
      }
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setProClaimsLoading(false);
    }
  };

  const fetchActiveRelease = async () => {
    try {
      const res = await fetch("/api/admin/release-notes", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.releaseNote) {
          setActiveReleaseNote(data.releaseNote);
          if (data.releaseNote.version) setRelVersion(data.releaseNote.version);
          if (data.releaseNote.title) setRelTitle(data.releaseNote.title);
          if (data.releaseNote.content) setRelContent(data.releaseNote.content);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    fetchProClaims();
    fetchActiveRelease();
  }, [user.idToken]);

  const handleGenerateReleaseNotesAI = async () => {
    setRelGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/release-notes/generate", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ version: relVersion.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.version) setRelVersion(data.version);
        if (data.title) setRelTitle(data.title);
        if (data.content) setRelContent(data.content);
        setStatusMessage({
          text: `Generated release notes for ${data.version} (${data.source || "release"}) using AI!`,
          type: "success",
        });
      } else {
        setStatusMessage({
          text: data.error || "Failed to generate release notes with AI.",
          type: "error",
        });
      }
    } catch {
      setStatusMessage({
        text: "Network error occurred while calling AI release notes generator.",
        type: "error",
      });
    } finally {
      setRelGenerating(false);
    }
  };

  const handlePublishReleaseNotes = async () => {
    if (!relVersion.trim() || !relTitle.trim() || !relContent.trim()) return;
    setRelPublishing(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/release-notes", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          version: relVersion,
          title: relTitle,
          content: relContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          text: `Release notes for ${relVersion} published! Users will see them once upon opening the app.`,
          type: "success",
        });
        setActiveReleaseNote(data.releaseNote || null);
      } else {
        setStatusMessage({ text: data.error || "Failed to publish release notes.", type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Network error occurred while publishing release notes.", type: "error" });
    } finally {
      setRelPublishing(false);
    }
  };

  const handleDeactivateReleaseNotes = async () => {
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/release-notes", {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (res.ok) {
        setActiveReleaseNote(null);
        setStatusMessage({ text: "In-app release prompt deactivated.", type: "info" });
      }
    } catch {
      setStatusMessage({ text: "Network error occurred.", type: "error" });
    }
  };

  const handleProAction = async (id: string, action: "approve" | "deny") => {
    setProActionLoading(id);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/pro-requests", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ claimId: id, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Request ${action}d successfully.`, type: "success" });
        fetchProClaims();
      } else {
        setStatusMessage({ text: data.error || "Failed to update request", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Network error occurred.", type: "error" });
    } finally {
      setProActionLoading(null);
    }
  };

  const handleProductionCronClick = (id: string, title: string) => {
    setConfirmModal({ id, title });
  };

  const confirmAndRun = async () => {
    if (!confirmModal) return;
    const { id } = confirmModal;
    setConfirmModal(null);
    setCronRunning(id);
    setStatusMessage(null);

    try {
      const endpoint = "/api/admin/cron";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ triggerType: id, task: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Production task fired successfully. Output: ${data.message || data.response?.message || "OK"}`, type: "success" });
      } else {
        setStatusMessage({ text: data.error || "Failed to fire production task.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Task trigger failed due to network error.", type: "error" });
    } finally {
      setCronRunning(null);
    }
  };

  const sendPreviewEmail = async (task: string) => {
    setPreviewLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/preview-email", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ type: task }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Test preview email dispatched to ${user.email}`, type: "success" });
      } else {
        setStatusMessage({ text: data.error || "Failed to dispatch preview email.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Failed to connect to Resend API.", type: "error" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const flushCache = async () => {
    setFlushLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/cache-flush", {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: data.message || "Redis cache flushed successfully.", type: "success" });
      } else {
        setStatusMessage({ text: data.error || "Cache flush failed.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Failed to communicate with database.", type: "error" });
    } finally {
      setFlushLoading(false);
    }
  };

  const runEncryptionMigration = async () => {
    if (!window.confirm("WARNING: This will re-encrypt all user records in the Firestore database. Proceed?")) return;
    setMigrationLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/migrate-encryption", {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Migration complete. Success: ${data.successCount}, Skipped: ${data.skippedCount}, Failed: ${data.failedCount}`, type: "success" });
      } else {
        setStatusMessage({ text: data.error || "Migration failed.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ text: "Database migration error.", type: "error" });
    } finally {
      setMigrationLoading(false);
    }
  };

  const emailHtmlPreview = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 16px;
            background-color: #f4f3ec;
            color: #1c1b18;
          }
          .bento-card {
            background-color: #fcfbfa;
            border: 1px solid #eae8e0;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(28,27,24,0.02);
            max-width: 100%;
            box-sizing: border-box;
          }
          .header {
            border-bottom: 1px solid #eae8e0;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            font-weight: 500;
          }
          .txt-main { color: #1c1b18; }
          .txt-muted { color: #7c7a72; }
          .title {
            font-family: Georgia, "Times New Roman", serif;
            font-style: italic;
            font-size: 21px;
            font-weight: normal;
            margin: 0 0 12px 0;
            line-height: 1.3;
            color: #1c1b18;
          }
          .content {
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            color: #2e2d27;
          }
          .footer {
            margin-top: 24px;
            border-top: 1px solid #eae8e0;
            padding-top: 16px;
            text-align: center;
          }
          .btn-primary {
            display: inline-block;
            background-color: #1c1b18;
            color: #ffffff !important;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 6px;
          }
          .footer-text {
            font-size: 9px;
            margin-top: 12px;
            color: #8c8a80;
          }
        </style>
      </head>
      <body>
        <div class="bento-card">
          <div class="header">
            <span class="txt-main">Continuum Home</span>
            <span class="txt-muted">Announcement</span>
          </div>
          <div>
            <h1 class="title">${annTitle || "Announcement Title"}</h1>
            <div class="content">${annContent || "Write something..."}</div>
          </div>
          <div class="footer">
            <a href="https://continuum-home.vercel.app" class="btn-primary">Open Dashboard</a>
            <p class="footer-text">Continuum — steady flow of life progression.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const CARD = "rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-subtle";

  return (
    <div className="flex flex-col gap-6 w-full max-md:pb-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-text-primary animate-pulse" />
          <div>
            <h1 className="font-serif text-[26px] italic font-medium tracking-tight text-text-primary">Admin Panel</h1>
            <p className="text-[12px] text-text-secondary">System-wide parameters, developer operations, and Pro verification</p>
          </div>
        </div>

        <div className="flex gap-6 border-b border-border-subtle max-sm:gap-4 max-sm:overflow-x-auto max-sm:scrollbar-none max-sm:-mx-1 max-sm:px-1">
          {["overview", "communications", "system", "pro-requests"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setStatusMessage(null);
              }}
              className={`relative pb-3 text-[13px] font-medium transition-all whitespace-nowrap capitalize ${
                activeTab === tab
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.replace("-", " ")}
              {tab === "pro-requests" && proClaims.filter((c) => c.status === "pending").length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded-none">
                  {proClaims.filter((c) => c.status === "pending").length}
                </span>
              )}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className={`rounded-none border px-4 py-3 text-xs animate-[heroFadeUp_0.3s_ease-out_both] ${
          statusMessage.type === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_both]">
          {proClaims.filter((c) => c.status === "pending").length > 0 && (
            <div className="flex items-center justify-between border-2 border-amber-600/40 bg-amber-500/10 p-4 max-sm:flex-col max-sm:items-start max-sm:gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <div className="text-xs font-bold text-text-primary">
                    {proClaims.filter((c) => c.status === "pending").length} Pro Claim{proClaims.filter((c) => c.status === "pending").length === 1 ? "" : "s"} Awaiting Verification
                  </div>
                  <div className="text-[11px] text-text-secondary">
                    Users have submitted payment proof for upgraded Pro features.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("pro-requests")}
                className="flex items-center gap-1.5 border-2 border-text-primary bg-text-primary px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-bg-card hover:bg-bg-primary hover:text-text-primary transition-all shrink-0"
              >
                <span>Review Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          

          <div className={CARD}>
            <div className="flex items-center justify-between border-b-2 border-border-subtle pb-3 mb-4">
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2">
                <Zap className="h-4 w-4" /> Quick Operations Deck
              </h3>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-text-muted">1-Click Triggers</span>
            </div>

            <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
              <button
                onClick={flushCache}
                disabled={flushLoading}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Cache
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">REDIS</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">
                  {flushLoading ? "Flushing Cache..." : "Flush Redis Cache"}
                </span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Invalidate cached API responses and sync keys across instances.
                </span>
              </button>

              <button
                onClick={handleQuickDiscordPing}
                disabled={discordSending}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5" /> Webhook
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#5865F2] px-1.5 py-0.5">DISCORD</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">
                  {discordSending ? "Pinging..." : "Test Discord Ping"}
                </span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Send an instantaneous test alert to the configured Discord channel.
                </span>
              </button>

              <button
                onClick={() => sendPreviewEmail("expenses")}
                disabled={previewLoading}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Dispatch
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">RESEND</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">
                  {previewLoading ? "Sending Email..." : "Send Test Digest"}
                </span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Dispatches a sample weekly digest email directly to {user.email}.
                </span>
              </button>

              <button
                onClick={() => handleProductionCronClick("portfolio", "Portfolio Valuation Sync")}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Market
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">YAHOO / CRON</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">Sync Portfolio Net Worth</span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Polls live market prices and updates portfolio historical net worth.
                </span>
              </button>

              <button
                onClick={() => handleProductionCronClick("subscriptions", "Subscription Renewal Audit")}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Recurrence
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">CRON</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">Audit Subscription Cycles</span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Checks renewals and logs automated recurring expense line items.
                </span>
              </button>

              <button
                onClick={() => setActiveTab("communications")}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5" /> Broadcast
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">COMM</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">Compose Announcement</span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Open email & Discord broadcast center to send system notices.
                </span>
              </button>

              <button
                onClick={handlePruneLegacy}
                disabled={pruneLoading}
                className="flex flex-col items-start gap-1 p-3.5 rounded-none border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all text-left disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> Maintenance
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-bg-card border border-border-subtle px-1.5 py-0.5">FIRESTORE</span>
                </div>
                <span className="text-xs font-bold text-text-primary mt-1">
                  {pruneLoading ? "Pruning..." : "Prune Legacy Collections"}
                </span>
                <span className="text-[11px] text-text-secondary leading-snug">
                  Purge obsolete collections (notes, watchlist, health_analytics).
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
            <div className={CARD}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3 mb-4">
                <Server className="h-4 w-4" /> Infrastructure Health
              </h3>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Database Engine", provider: "Cloud Firestore", status: "Operational", detail: "AES-256-GCM Encrypted" },
                  { name: "Cache Storage", provider: "Upstash Redis", status: "Active", detail: "Edge REST / Memory Key-Value" },
                  { name: "Email Relay", provider: "Resend", status: "Ready", detail: "Transaction & Announcement Gateway" },
                  { name: "Alert Webhooks", provider: "Discord API", status: "Connected", detail: "System Bot Dispatcher" },
                  { name: "Background Jobs", provider: "Vercel Cron", status: "5 Scheduled", detail: "Daily, Weekly & Monthly Tasks" },
                ].map((srv, i) => (
                  <div key={i} className="flex items-center justify-between border-2 border-border-subtle bg-bg-primary/20 p-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{srv.name}</span>
                        <span className="font-mono text-[10px] text-text-secondary">({srv.provider})</span>
                      </div>
                      <span className="text-[11px] text-text-secondary font-mono mt-0.5">{srv.detail}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-2 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      <span className="font-mono text-[10px] font-bold">{srv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={CARD}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3 mb-4">
                <Cpu className="h-4 w-4" /> Developer Hub & Consoles
              </h3>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Quick direct access to cloud providers, infrastructure dashboards, and upstream services managing Continuum Home.
                </p>

                <div className="grid grid-cols-2 gap-2.5 mt-1 max-sm:grid-cols-1">
                  {[
                    { name: "Vercel Deployments", url: "https://vercel.com", badge: "HOSTING" },
                    { name: "Firebase Console", url: "https://console.firebase.google.com", badge: "FIRESTORE" },
                    { name: "Upstash Redis", url: "https://console.upstash.com", badge: "CACHE" },
                    { name: "Resend Email", url: "https://resend.com", badge: "SMTP" },
                    { name: "Trakt.tv Developer", url: "https://trakt.tv/oauth/applications", badge: "API" },
                    { name: "GitHub Repository", url: "https://github.com/fal3n-4ngel/personal-dashboard", badge: "GIT" },
                  ].map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary hover:bg-bg-primary/40 transition-all group"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-text-primary truncate">{link.name}</span>
                        <span className="font-mono text-[9px] text-text-muted mt-0.5">{link.badge}</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-text-muted group-hover:text-text-primary transition-colors shrink-0 ml-2" />
                    </a>
                  ))}
                </div>

                <div className="mt-2 border-t-2 border-border-subtle pt-3 flex items-center justify-between text-[11px] font-mono text-text-secondary">
                  <span>Admin Identity:</span>
                  <span className="text-text-primary font-bold truncate max-w-[200px]">{user.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "communications" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_both]">
          <div className={CARD}>
            <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3 mb-4">
              <TerminalSquare className="h-4 w-4" /> Discord Bot Dispatcher
            </h3>
            <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Custom Alert Message</label>
                  <textarea
                    value={discordMsg}
                    onChange={(e) => setDiscordMsg(e.target.value)}
                    placeholder="Type a message to instantly push to the Discord discussion channel (Markdown supported)..."
                    rows={6}
                    className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2.5 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-mono leading-relaxed resize-y"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    disabled={discordSending || !discordMsg.trim()}
                    onClick={handleDiscordSend}
                    className="rounded-none border-2 border-text-primary bg-text-primary px-5 py-2 text-xs font-bold uppercase tracking-wide text-bg-card transition-all hover:bg-bg-primary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {discordSending ? "Dispatching..." : "Send Discord Alert"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-none border-2 border-border-subtle bg-bg-primary/20 p-4">
                <div className="flex items-center justify-between border-b-2 border-border-subtle pb-2 mb-2">
                  <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">LIVE DISCORD PREVIEW</span>
                </div>

                <div className="flex-1 bg-[#313338] p-4 flex gap-3 overflow-hidden shadow-inner">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-lg">
                    C
                  </div>
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-medium text-[15px]">Continuum Alerts</span>
                      <span className="text-[10px] bg-[#5865F2] text-white px-1 py-0.5 rounded-sm font-semibold tracking-wide">APP</span>
                      <span className="text-[#949BA4] text-[12px]">Today at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>

                    <div className="mt-1 border-l-4 border-[#d4c6b1] bg-[#2B2D31] rounded-r p-3">
                      <div className="text-white font-semibold text-[15px] mb-1">System Notification</div>
                      <div className="text-[#DBDEE1] text-[14px] whitespace-pre-wrap font-sans break-words leading-relaxed">{discordMsg || "Your message will appear here..."}</div>
                      <div className="mt-3 text-[#DBDEE1]/60 text-[11px]">Continuum Dashboard • Manual Trigger</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={CARD}>
            <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3 mb-4">
              <Bell className="h-4 w-4" /> System Announcement Dispatcher
            </h3>

            <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Email Subject Line</label>
                  <input
                    type="text"
                    value={annSubject}
                    onChange={(e) => setAnnSubject(e.target.value)}
                    placeholder="e.g. New updates and features on Continuum!"
                    className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Header Title</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Announcing Rebranding & Custom GPTs"
                    className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Announcement Body Content</label>
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Type your markdown or text announcement here..."
                    rows={10}
                    className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2.5 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-sans leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end mt-1">
                  <button
                    disabled={annSending !== null || !annSubject.trim() || !annTitle.trim() || !annContent.trim()}
                    onClick={() => handleAnnouncement("preview")}
                    className="rounded-none border-2 border-border-subtle bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-primary transition-all hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {annSending === "preview" ? "Sending Test..." : "Send Test to Admin"}
                  </button>
                  <button
                    disabled={annSending !== null || !annSubject.trim() || !annTitle.trim() || !annContent.trim()}
                    onClick={() => setAnnConfirmModal(true)}
                    className="rounded-none border-2 border-text-primary bg-text-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-bg-card transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {annSending === "send" ? "Broadcasting..." : "Broadcast to All Users"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-none border-2 border-border-subtle bg-bg-primary/20 p-4">
                <div className="flex items-center justify-between border-b-2 border-border-subtle pb-2 mb-2">
                  <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">LIVE EMAIL PREVIEW</span>
                  <span className="text-[10px] text-text-muted italic">Updates in real-time</span>
                </div>

                <div className="text-xs text-text-secondary mb-2 font-mono truncate">
                  <strong className="text-text-primary">Subject:</strong> {annSubject || "(No Subject)"}
                </div>

                <div className="flex-1 rounded-none border-2 border-border-subtle bg-bg-card overflow-hidden h-[330px] shadow-inner">
                  <iframe
                    title="Announcement Email Preview"
                    srcDoc={emailHtmlPreview}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={CARD}>
            <div className="flex items-center justify-between border-b-2 border-border-subtle pb-3 mb-4">
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" /> In-App Release Notes Dispatcher
              </h3>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={relGenerating}
                  onClick={handleGenerateReleaseNotesAI}
                  className="flex items-center gap-1.5 rounded-none border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Bot className={`h-3.5 w-3.5 ${relGenerating ? "animate-spin" : ""}`} />
                  <span>{relGenerating ? "Extracting Commits..." : "Generate with AI"}</span>
                </button>
                {activeReleaseNote?.active && (
                  <div className="flex items-center gap-2 border-l border-border-subtle pl-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live: {activeReleaseNote.version}
                    </span>
                    <button
                      type="button"
                      onClick={handleDeactivateReleaseNotes}
                      className="text-[10px] font-mono text-text-muted hover:text-rose-500 underline cursor-pointer"
                    >
                      Deactivate
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Publish release notes that automatically display once in an in-app modal when users next open the application. Once dismissed, users are never prompted again for this version.
            </p>

            <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-lg:grid-cols-1">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Release Version Tag</label>
                    <input
                      type="text"
                      value={relVersion}
                      onChange={(e) => setRelVersion(e.target.value)}
                      placeholder="e.g. v1.3.0"
                      className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2 text-xs font-mono text-text-primary outline-none transition-all focus:border-text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Release Headline</label>
                    <input
                      type="text"
                      value={relTitle}
                      onChange={(e) => setRelTitle(e.target.value)}
                      placeholder="e.g. Historical Analytics & UI Polish"
                      className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Release Highlights & Notes (Markdown/Bullets)</label>
                  <textarea
                    value={relContent}
                    onChange={(e) => setRelContent(e.target.value)}
                    placeholder="Type what's new in this release..."
                    rows={8}
                    className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2.5 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-sans leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end mt-1">
                  <button
                    type="button"
                    disabled={!relVersion.trim() || !relTitle.trim() || !relContent.trim()}
                    onClick={() => setShowRelPreviewModal(true)}
                    className="rounded-none border-2 border-border-subtle bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-primary transition-all hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Preview In-App Modal
                  </button>
                  <button
                    type="button"
                    disabled={relPublishing || !relVersion.trim() || !relTitle.trim() || !relContent.trim()}
                    onClick={handlePublishReleaseNotes}
                    className="rounded-none border-2 border-text-primary bg-text-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-bg-card transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {relPublishing ? "Publishing..." : "Publish In-App Release Notes"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-none border-2 border-border-subtle bg-bg-primary/30 p-4">
                <div className="flex items-center justify-between border-b-2 border-border-subtle pb-2">
                  <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">MODAL QUICK VIEW</span>
                  <span className="text-[10px] text-text-muted italic">User launch preview</span>
                </div>
                <div className="rounded-xl border border-border-subtle bg-bg-card p-4 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-semibold text-text-muted uppercase">What's New</span>
                    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.2 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      {relVersion || "v0.0.0"}
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-text-primary">
                    {relTitle || "Release Title"}
                  </h4>
                  <p className="text-[11px] text-text-secondary line-clamp-4 leading-relaxed whitespace-pre-wrap">
                    {relContent || "No release notes specified."}
                  </p>
                  <div className="pt-2">
                    <div className="rounded-lg bg-text-primary text-bg-primary text-[11px] font-medium text-center py-1.5">
                      Got It, Explore Now →
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "system" && (
        <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1 animate-[fadeIn_0.3s_ease-out_both]">
          <CronTriggerSection
            previewLoading={previewLoading}
            cronRunning={cronRunning}
            sendPreviewEmail={sendPreviewEmail}
            handleProductionCronClick={handleProductionCronClick}
          />

          <div className="flex flex-col gap-6">
            <div className={`${CARD} flex flex-col gap-4`}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3">
                <RefreshCw className="h-4 w-4" /> System Commands
              </h3>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Flush Redis cache values or re-encrypt DB rows for every registered cloud user.
              </p>

              <div className="flex flex-col gap-2.5 mt-2">
                <button
                  disabled={flushLoading}
                  onClick={flushCache}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-none border-2 border-border-subtle bg-bg-primary/40 hover:bg-bg-primary hover:border-text-primary text-xs font-semibold text-text-primary py-2.5 transition-all disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {flushLoading ? "Flushing Cache..." : "Flush Redis Cache"}
                </button>

                <button
                  disabled={migrationLoading}
                  onClick={runEncryptionMigration}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-none border-2 border-border-subtle bg-transparent text-xs font-semibold text-text-primary py-2.5 transition-all hover:bg-bg-primary hover:border-text-primary disabled:opacity-50"
                >
                  <Shield className="h-3.5 w-3.5" /> {migrationLoading ? "Encrypting Records..." : "Encrypt All Users' Data"}
                </button>
              </div>
            </div>

            <div className={`${CARD} flex flex-col gap-4`}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b-2 border-border-subtle pb-3">
                <Server className="h-4 w-4" /> System Info
              </h3>
              <div className="flex flex-col gap-2.5 font-mono text-[10px] text-text-secondary">
                <div className="flex justify-between border-b-2 border-border-subtle pb-1.5">
                  <span>DEPLOYED URL</span>
                  <span className="text-text-primary truncate max-w-[130px]">{user.email ? "https://continuum-home.vercel.app" : "http://localhost:3000"}</span>
                </div>
                <div className="flex justify-between border-b-2 border-border-subtle pb-1.5">
                  <span>REDIS STATUS</span>
                  <span className="text-text-primary font-bold">CONNECTED</span>
                </div>
                <div className="flex justify-between border-b-2 border-border-subtle pb-1.5">
                  <span>ENCRYPTION</span>
                  <span className="text-text-primary">AES-256-GCM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pro-requests" && (
        <div className="animate-[fadeIn_0.3s_ease-out_both]">
          <ProClaimsQueue
            proClaims={proClaims}
            proClaimsLoading={proClaimsLoading}
            proClaimsFilter={proClaimsFilter}
            setProClaimsFilter={setProClaimsFilter}
            fetchProClaims={fetchProClaims}
            proActionLoading={proActionLoading}
            handleProAction={handleProAction}
          />
        </div>
      )}

      {confirmModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px]"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="relative w-[420px] max-w-[90vw] rounded-none border-2 border-border-subtle bg-bg-card p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-none bg-rose-500/10 border-2 border-rose-500/30 p-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-medium italic text-text-primary">Production Trigger</h2>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  This will fire <strong className="text-text-primary">{confirmModal.title}</strong> for <strong className="text-rose-500 dark:text-rose-400">every registered user</strong> on the platform. Real emails will be sent.
                </p>
              </div>
            </div>

            <div className="rounded-none bg-rose-500/10 border-2 border-rose-500/30 px-4 py-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">
              ⚠️ Are you sure you want to proceed? This cannot be undone.
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-none border-2 border-border-subtle bg-transparent py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary hover:border-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndRun}
                className="flex-1 rounded-none border-2 border-rose-600 bg-rose-600 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all hover:bg-rose-700"
              >
                Yes, Run Cron
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {annConfirmModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px]"
          onClick={() => setAnnConfirmModal(false)}
        >
          <div
            className="relative w-[420px] max-w-[90vw] rounded-none border-2 border-border-subtle bg-bg-card p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-none bg-rose-500/10 border-2 border-rose-500/30 p-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-medium italic text-text-primary">Broadcast Announcement</h2>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  This will dispatch emails to <strong className="text-rose-500 dark:text-rose-400">every registered user</strong> on the platform.
                </p>
              </div>
            </div>

            <div className="rounded-none bg-rose-500/10 border-2 border-rose-500/30 px-4 py-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">
              ⚠️ Are you sure you want to broadcast? This will email all active users.
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setAnnConfirmModal(false)}
                className="flex-1 rounded-none border-2 border-border-subtle bg-transparent py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary hover:border-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAnnouncement("send")}
                className="flex-1 rounded-none border-2 border-rose-600 bg-rose-600 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all hover:bg-rose-700"
              >
                Yes, Send Broadcast
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ReleaseNotesModal
        isOpen={showRelPreviewModal}
        onClose={() => setShowRelPreviewModal(false)}
        releaseNote={{
          version: relVersion,
          title: relTitle,
          content: relContent,
        }}
        isPreview={true}
      />
    </div>
  );
}
