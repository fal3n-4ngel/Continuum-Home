"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FirebaseUser, ProClaim } from "@/types";
import { 
  Shield, 
  Trash2, 
  Bell, 
  Mail, 
  RefreshCw, 
  BarChart2, 
  Sparkles, 
  AlertTriangle, 
  Star, 
  Activity,
  Server,
  TerminalSquare,
  Users
} from "lucide-react";
import { ProClaimsQueue } from "./admin/ProClaimsQueue";
import { CronTriggerSection } from "./admin/CronTriggerSection";

interface AdminTabProps {
  user: FirebaseUser;
}

export function AdminTab({ user }: AdminTabProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<"analytics" | "communications" | "system" | "pro-requests">("analytics");

  // Admin stats
  const [stats, setStats] = useState<{
    expenses: number;
    subscriptions: number;
    watchlist: number;
    portfolioAssets: number;
    portfolioValue: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [gptMetrics, setGptMetrics] = useState<any>(null);

  // Operation states
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [flushLoading, setFlushLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ id: string; title: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Pro Requests state
  const [proClaims, setProClaims] = useState<ProClaim[]>([]);
  const [proClaimsLoading, setProClaimsLoading] = useState(false);
  const [proClaimsFilter, setProClaimsFilter] = useState<"pending" | "approved" | "denied" | "all">("pending");
  const [proActionLoading, setProActionLoading] = useState<string | null>(null);

  // Analytics sub-scope state
  const [analyticsScope, setAnalyticsScope] = useState<"web" | "agent">("web");

  // Announcement states
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

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "X-Client": "web",
    Authorization: `Bearer ${user.idToken}`,
  });

  // Fetch admin metrics & GPT usage
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const headers = getHeaders();
      const [expRes, subRes, watchRes, portRes, metricsRes] = await Promise.all([
        fetch("/api/expenses", { headers }),
        fetch("/api/subscriptions", { headers }),
        fetch("/api/watchlist", { headers }),
        fetch("/api/portfolio", { headers }),
        fetch("/api/admin/metrics", { headers }),
      ]);

      const expenses = expRes.ok ? await expRes.json() : [];
      const subscriptions = subRes.ok ? await subRes.json() : [];
      const watchlist = watchRes.ok ? await watchRes.json() : [];
      const portfolio = portRes.ok ? await portRes.json() : null;
      const metrics = metricsRes.ok ? await metricsRes.json() : null;

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
      setGptMetrics(metrics);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Pro claim requests
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

  useEffect(() => {
    fetchStats();
    fetchProClaims();
  }, [user.idToken]);

  // Handle Approve/Deny action
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

  // Run a cron task in production
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

  // Send a test preview email to admin's inbox
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

  // Flush Redis Edge Cache
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

  // Migrate DB Encryption
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

  const CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Title & Tabs */}
      <div className="border-b border-border-subtle pb-0">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-text-primary animate-pulse" />
          <div>
            <h1 className="font-serif text-[26px] italic font-medium tracking-tight text-text-primary">Admin Panel</h1>
            <p className="text-[12px] text-text-secondary">System-wide parameters, analytics, and Pro verification</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {["analytics", "communications", "system", "pro-requests"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setStatusMessage(null); // Clear errors when switching tabs
              }}
              className={`pb-3 text-[13px] font-semibold capitalize transition-all ${
                activeTab === tab 
                  ? "border-b-2 border-text-primary text-text-primary" 
                  : "border-b-2 border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div className={`rounded-[8px] border px-4 py-3 text-xs animate-[heroFadeUp_0.3s_ease-out_both] ${
          statusMessage.type === "success" 
            ? "border-[#bbf7d0] bg-[#f0fdf4]/80 text-[#166534]" 
            : "border-[#fecaca] bg-[#fef2f2]/80 text-[#991b1b]"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* ──────────────── TAB: ANALYTICS ──────────────── */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_both]">
          {/* System Metrics Cards */}
          <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2">
            {[
              { label: "EXPENSES", val: statsLoading ? "..." : stats?.expenses },
              { label: "SUBSCRIPTIONS", val: statsLoading ? "..." : stats?.subscriptions },
              { label: "LIBRARY ITEMS", val: statsLoading ? "..." : stats?.watchlist },
              { label: "PORTFOLIO VALUE", val: statsLoading ? "..." : `₹${stats?.portfolioValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}` },
            ].map((card, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-4.5 shadow-subtle">
                <span className="font-mono text-[9px] font-bold tracking-[0.8px] text-text-muted uppercase">{card.label}</span>
                <span className="text-[20px] font-bold tracking-tight text-text-primary mt-1">{card.val}</span>
              </div>
            ))}
          </div>

          {/* Global API Analytics */}
          <div className="flex items-center justify-between mt-4">
            <h2 className="font-serif text-[18px] italic font-medium text-text-primary">Global API Usage</h2>
            <div className="flex bg-bg-primary/50 p-1 rounded-md border border-border-subtle">
              <button 
                onClick={() => setAnalyticsScope("web")}
                className={`px-4 py-1 text-[11px] font-bold tracking-wide uppercase rounded-sm transition-all ${analyticsScope === "web" ? "bg-bg-card shadow-subtle text-text-primary" : "text-text-muted hover:text-text-primary"}`}
              >
                Web App
              </button>
              <button 
                onClick={() => setAnalyticsScope("agent")}
                className={`px-4 py-1 text-[11px] font-bold tracking-wide uppercase rounded-sm transition-all ${analyticsScope === "agent" ? "bg-bg-card shadow-subtle text-text-primary" : "text-text-muted hover:text-text-primary"}`}
              >
                AI Agent
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
            {/* Top Endpoints */}
            <div className={CARD}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
                <TerminalSquare className="h-4 w-4" /> Most Used Functionality ({analyticsScope === "web" ? "Web" : "Agent"})
              </h3>
              {gptMetrics?.globalMetrics?.[analyticsScope]?.topEndpoints && gptMetrics.globalMetrics[analyticsScope].topEndpoints.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {gptMetrics.globalMetrics[analyticsScope].topEndpoints.map((ep: any, i: number) => (
                    <div key={ep.name} className="flex items-center gap-3">
                      <div className="w-5 text-center font-mono text-[10px] font-bold text-text-muted">{i + 1}</div>
                      <div className="flex-1 flex justify-between items-center rounded-lg border border-border-subtle bg-bg-primary/20 p-2.5 px-3">
                        <div className="text-[12px] font-mono text-text-primary truncate max-w-[250px]">{ep.name}</div>
                        <div className="text-[11px] font-semibold text-text-secondary">{ep.calls} calls</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No API usage recorded yet.</p>
              )}
            </div>

            {/* Power Users */}
            <div className={CARD}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
                <Users className="h-4 w-4" /> API Uses Per User ({analyticsScope === "web" ? "Web" : "Agent"})
              </h3>
              {gptMetrics?.globalMetrics?.[analyticsScope]?.topUsers && gptMetrics.globalMetrics[analyticsScope].topUsers.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {gptMetrics.globalMetrics[analyticsScope].topUsers.map((u: any, i: number) => (
                    <div key={u.name} className="flex items-center gap-3">
                      <div className="w-5 text-center font-mono text-[10px] font-bold text-text-muted">{i + 1}</div>
                      <div className="flex-1 flex justify-between items-center rounded-lg border border-border-subtle bg-bg-primary/20 p-2.5 px-3">
                        <div className="text-[12px] font-medium text-text-primary truncate max-w-[200px]">{u.name}</div>
                        <div className="text-[11px] font-semibold text-text-secondary">{u.calls} hits</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-secondary italic">No user activity recorded yet.</p>
              )}
            </div>
          </div>

          {/* Custom GPT Analytics */}
          <div className={CARD}>
            <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <Activity className="h-4 w-4" /> Custom GPT Actions Log
            </h3>
            <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1">
              <div>
                <h4 className="text-[12.5px] font-bold text-text-primary mb-3">Connected GPT Users ({gptMetrics?.activeUsersCount || 0})</h4>
                {gptMetrics?.users && gptMetrics.users.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {gptMetrics.users.map((gptUser: any) => (
                      <div key={gptUser.email} className="flex justify-between items-center rounded-lg border border-border-subtle bg-bg-primary/20 p-3">
                        <div className="text-[12.5px] font-medium text-text-primary truncate max-w-[200px]">{gptUser.email}</div>
                        <div className="text-[10px] font-mono text-text-secondary">
                          {gptUser.lastActive ? new Date(gptUser.lastActive).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "Never"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary italic">No users have authorized Custom GPT actions yet.</p>
                )}
              </div>

              <div className="flex flex-col gap-5 border-l border-border-subtle pl-6 max-md:border-l-0 max-md:pl-0">
                <div>
                  <div className="text-[9px] font-bold font-mono tracking-wider text-text-muted uppercase">TOTAL GPT CALLS</div>
                  <div className="text-2xl font-bold mt-1 text-text-primary">{gptMetrics?.totalCalls || 0}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold font-mono tracking-wider text-text-muted uppercase mb-2.5">7-DAY GPT VOLUME</div>
                  {gptMetrics?.dailyUsage ? (
                    <div className="flex flex-col gap-1.5 font-mono text-[11px] text-text-secondary">
                      {gptMetrics.dailyUsage.map((day: any) => (
                        <div key={day.date} className="flex justify-between border-b border-bg-primary pb-1">
                          <span>{day.date}</span>
                          <span className="font-semibold text-text-primary">{day.calls} call{day.calls === 1 ? "" : "s"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-secondary italic">No usage recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB: COMMUNICATIONS ──────────────── */}
      {activeTab === "communications" && (
        <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_both]">
          {/* System Announcements */}
          <div className={CARD}>
            <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
              <Bell className="h-4 w-4" /> System Announcement Dispatcher
            </h3>
            
            <div className="grid grid-cols-[1.2fr_1fr] gap-6 max-lg:grid-cols-1">
              {/* Column 1: Editor Form */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Email Subject Line</label>
                  <input
                    type="text"
                    value={annSubject}
                    onChange={(e) => setAnnSubject(e.target.value)}
                    placeholder="e.g. New updates and features on Continuum!"
                    className="w-full rounded-md border border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Header Title</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Announcing Rebranding & Custom GPTs"
                    className="w-full rounded-md border border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Announcement Body Content</label>
                  <textarea
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Type your markdown or text announcement here..."
                    rows={10}
                    className="w-full rounded-md border border-border-subtle bg-bg-primary px-3.5 py-2.5 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-sans leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center gap-3 justify-end mt-1">
                  <button
                    disabled={annSending !== null || !annSubject.trim() || !annTitle.trim() || !annContent.trim()}
                    onClick={() => handleAnnouncement("preview")}
                    className="rounded-full border border-border-subtle bg-transparent px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {annSending === "preview" ? "Sending Test..." : "Send Test to Admin"}
                  </button>
                  <button
                    disabled={annSending !== null || !annSubject.trim() || !annTitle.trim() || !annContent.trim()}
                    onClick={() => setAnnConfirmModal(true)}
                    className="rounded-full border border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-bg-card transition-all hover:bg-[#2e2d27] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {annSending === "send" ? "Broadcasting..." : "Broadcast to All Users"}
                  </button>
                </div>
              </div>

              {/* Column 2: Live HTML Viewport Preview */}
              <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-primary/20 p-4">
                <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
                  <span className="font-mono text-[9px] font-bold text-text-secondary uppercase tracking-wider">LIVE EMAIL PREVIEW</span>
                  <span className="text-[10px] text-text-muted italic">Updates in real-time</span>
                </div>
                
                <div className="text-xs text-text-secondary mb-2 font-mono truncate">
                  <strong className="text-text-primary">Subject:</strong> {annSubject || "(No Subject)"}
                </div>

                <div className="flex-1 rounded-md border border-border-subtle bg-bg-card overflow-hidden h-[330px] shadow-inner">
                  <iframe
                    title="Announcement Email Preview"
                    srcDoc={emailHtmlPreview}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB: SYSTEM OPERATIONS ──────────────── */}
      {activeTab === "system" && (
        <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1 animate-[fadeIn_0.3s_ease-out_both]">
          {/* Left Column: Cron Alerts Operations */}
          <CronTriggerSection
            previewLoading={previewLoading}
            cronRunning={cronRunning}
            sendPreviewEmail={sendPreviewEmail}
            handleProductionCronClick={handleProductionCronClick}
          />

          {/* Right Column: Database / Cache Systems */}
          <div className="flex flex-col gap-6">
            <div className={`${CARD} flex flex-col gap-4`}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
                <RefreshCw className="h-4 w-4" /> System Commands
              </h3>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Flush Redis cache values or re-encrypt DB rows for every registered cloud user.
              </p>

              <div className="flex flex-col gap-2.5 mt-2">
                <button
                  disabled={flushLoading}
                  onClick={flushCache}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-full border border-text-primary bg-text-primary text-xs font-semibold text-bg-card py-2.5 transition-all hover:bg-[#2e2d27] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {flushLoading ? "Flushing Cache..." : "Flush Redis Cache"}
                </button>

                <button
                  disabled={migrationLoading}
                  onClick={runEncryptionMigration}
                  className="w-full flex items-center justify-center gap-2 cursor-pointer rounded-full border border-border-subtle bg-transparent text-xs font-semibold text-text-primary py-2.5 transition-all hover:bg-bg-primary disabled:opacity-50"
                >
                  <Shield className="h-3.5 w-3.5" /> {migrationLoading ? "Encrypting Records..." : "Encrypt All Users' Data"}
                </button>
              </div>
            </div>

            {/* Quick Server Info */}
            <div className={`${CARD} flex flex-col gap-4`}>
              <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
                <Server className="h-4 w-4" /> System Info
              </h3>
              <div className="flex flex-col gap-2.5 font-mono text-[10px] text-text-secondary">
                <div className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span>DEPLOYED URL</span>
                  <span className="text-text-primary truncate max-w-[130px]">{user.email ? "https://continuum-home.vercel.app" : "http://localhost:3000"}</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span>REDIS STATUS</span>
                  <span className="text-text-primary font-bold">CONNECTED</span>
                </div>
                <div className="flex justify-between border-b border-border-subtle pb-1.5">
                  <span>ENCRYPTION</span>
                  <span className="text-text-primary">AES-256-GCM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB: PRO REQUESTS ──────────────── */}
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

      {/* Confirmation Modal */}
      {confirmModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px]"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="relative w-[420px] max-w-[90vw] rounded-card border border-border-subtle bg-bg-card p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-full bg-[#fef2f2] border border-[#fecaca] p-2.5">
                <AlertTriangle className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-medium italic text-text-primary">Production Trigger</h2>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  This will fire <strong className="text-text-primary">{confirmModal.title}</strong> for <strong className="text-[#dc2626]">every registered user</strong> on the platform. Real emails will be sent.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-xs text-[#991b1b] font-semibold">
              ⚠️ Are you sure you want to proceed? This cannot be undone.
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 rounded-full border border-border-subtle bg-transparent py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndRun}
                className="flex-1 rounded-full border border-[#dc2626] bg-[#dc2626] py-2 text-xs font-semibold text-white transition-all hover:bg-[#b91c1c]"
              >
                Yes, Run Cron
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Announcement Broadcast Confirmation Modal */}
      {annConfirmModal && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px]"
          onClick={() => setAnnConfirmModal(false)}
        >
          <div
            className="relative w-[420px] max-w-[90vw] rounded-card border border-border-subtle bg-bg-card p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-full bg-[#fef2f2] border border-[#fecaca] p-2.5">
                <AlertTriangle className="h-5 w-5 text-[#dc2626]" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-medium italic text-text-primary">Broadcast Announcement</h2>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  This will dispatch emails to <strong className="text-[#dc2626]">every registered user</strong> on the platform.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-xs text-[#991b1b] font-semibold">
              ⚠️ Are you sure you want to broadcast? This will email all active users.
            </div>

            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setAnnConfirmModal(false)}
                className="flex-1 rounded-full border border-border-subtle bg-transparent py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAnnouncement("send")}
                className="flex-1 rounded-full border border-[#dc2626] bg-[#dc2626] py-2 text-xs font-semibold text-white transition-all hover:bg-[#b91c1c]"
              >
                Yes, Send Broadcast
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
