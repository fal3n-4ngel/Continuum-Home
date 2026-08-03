"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FirebaseUser } from "@/types";
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
  Server
} from "lucide-react";

interface AdminTabProps {
  user: FirebaseUser;
}

export function AdminTab({ user }: AdminTabProps) {
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
  interface ProClaim {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    platform: "github" | "bmac";
    handle: string;
    note: string;
    status: "pending" | "approved" | "denied";
    submittedAt: number;
  }
  const [proClaims, setProClaims] = useState<ProClaim[]>([]);
  const [proClaimsLoading, setProClaimsLoading] = useState(false);
  const [proClaimsFilter, setProClaimsFilter] = useState<"pending" | "approved" | "denied" | "all">("pending");
  const [proActionLoading, setProActionLoading] = useState<string | null>(null);

  // Announcement states
  const [annSubject, setAnnSubject] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
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
      const endpoint = id === "recommendations" ? "/api/admin/cron" : "/api/admin/cron";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ task: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `Production task fired successfully. Output: ${data.message || "OK"}`, type: "success" });
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
        body: JSON.stringify({ task }),
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

  const CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
  const BUTTON_GHOST = "cursor-pointer rounded-md border border-border-subtle bg-transparent text-[11px] font-semibold text-text-primary px-3 py-1.5 transition-all hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Title */}
      <div className="border-b border-border-subtle pb-5">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-text-primary animate-pulse" />
          <div>
            <h1 className="font-serif text-[26px] italic font-medium tracking-tight text-text-primary">Admin Panel</h1>
            <p className="text-[12px] text-text-secondary">System-wide parameters, analytics, and Pro verification</p>
          </div>
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

      {/* Custom GPT Analytics */}
      <div className={CARD}>
        <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
          <Activity className="h-4 w-4" /> Custom GPT Analytics
        </h3>
        <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1">
          {/* Left side: Users list */}
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

          {/* Right side: Summary & 7-Day Usage */}
          <div className="flex flex-col gap-5 border-l border-border-subtle pl-6 max-md:border-l-0 max-md:pl-0">
            <div>
              <div className="text-[9px] font-bold font-mono tracking-wider text-text-muted uppercase">TOTAL API CALLS</div>
              <div className="text-2xl font-bold mt-1 text-text-primary">{gptMetrics?.totalCalls || 0}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold font-mono tracking-wider text-text-muted uppercase mb-2.5">7-DAY VOLUME</div>
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

      <div className="grid grid-cols-[1.5fr_1fr] gap-6 max-md:grid-cols-1">
        {/* Left Column: Cron Alerts Operations */}
        <div className="flex flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle">
          <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3">
            <Mail className="h-4 w-4" /> Trigger Automated Crons
          </h3>
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            Manually trigger automated tasks. This fires notifications and emails to registered cloud users.
          </p>

          <div className="flex flex-col gap-3.5 mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-[#fecaca]" />
              <span className="font-mono text-[8.5px] font-bold text-[#dc2626] tracking-widest flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> PRODUCTION CRONS
              </span>
              <div className="flex-1 border-t border-[#fecaca]" />
            </div>

            {[
              {
                id: "subscriptions",
                previewId: "subscriptions",
                title: "Subscription Warnings",
                desc: "Alerts users of subscriptions renewing in 2-3 days.",
                icon: <Bell className="h-4 w-4 text-text-secondary" />,
                hasPreview: true,
              },
              {
                id: "expenses_weekly",
                previewId: "expenses_weekly",
                title: "Weekly Expense Summary",
                desc: "Dispatches 7-day category summary and burn rate.",
                icon: <BarChart2 className="h-4 w-4 text-text-secondary" />,
                hasPreview: true,
              },
              {
                id: "expenses_monthly",
                previewId: "expenses_monthly",
                title: "Monthly Expense Summary",
                desc: "Dispatches 30-day top outflows and category charts.",
                icon: <BarChart2 className="h-4 w-4 text-text-secondary" />,
                hasPreview: true,
              },
              {
                id: "portfolio",
                previewId: "portfolio",
                title: "Daily Portfolio Wrap",
                desc: "Calculates stock valuations and emails daily close Net P&L.",
                icon: <Mail className="h-4 w-4 text-text-secondary" />,
                hasPreview: true,
              },
              {
                id: "recommendations",
                previewId: null,
                title: "Daily AI Recommendations",
                desc: "Refreshes system suggestions for watchlist additions.",
                icon: <Sparkles className="h-4 w-4 text-text-secondary" />,
                hasPreview: false,
              },
            ].map((task) => (
              <div key={task.id} className="rounded-lg border border-[#fecaca]/60 bg-[#fef2f2]/40 p-3.5 hover:bg-[#fef2f2]/60 transition-colors flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                    {task.icon} {task.title}
                  </h4>
                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{task.desc}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {task.hasPreview && (
                    <button
                      disabled={previewLoading || cronRunning !== null}
                      onClick={() => sendPreviewEmail(task.previewId!)}
                      className="cursor-pointer rounded-md border border-[#3b82f6] bg-[#eff6ff] text-[10.5px] font-semibold text-[#1d4ed8] px-2.5 py-1.5 transition-all hover:bg-[#dbeafe] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {previewLoading ? "..." : "Preview"}
                    </button>
                  )}
                  <button
                    disabled={cronRunning !== null}
                    onClick={() => handleProductionCronClick(task.id, task.title)}
                    className="cursor-pointer rounded-md border border-[#dc2626] bg-transparent text-[10.5px] font-semibold text-[#dc2626] px-2.5 py-1.5 transition-all hover:bg-[#dc2626] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cronRunning === task.id ? "Running..." : "Run"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
                <span className="text-text-primary truncate max-w-[130px]">{user.email ? "https://continuuuum.vercel.app" : "http://localhost:3000"}</span>
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

      {/* System Announcements */}
      <div className={CARD}>
        <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2 border-b border-border-subtle pb-3 mb-4">
          <Bell className="h-4 w-4" /> System Announcement Dispatcher
        </h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
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
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">Announcement Body Content</label>
            <textarea
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              placeholder="Type your markdown or text announcement here..."
              rows={4}
              className="w-full rounded-md border border-border-subtle bg-bg-primary px-3.5 py-2.5 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-sans leading-relaxed resize-y"
            />
          </div>

          <div className="flex items-center gap-3 justify-end mt-1">
            <button
              disabled={annSending !== null || !annSubject.trim() || !annTitle.trim() || !annContent.trim()}
              onClick={() => handleAnnouncement("preview")}
              className="rounded-full border border-border-subtle bg-transparent px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {annSending === "preview" ? "Sending Preview..." : "Send Test Preview"}
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
      </div>

      {/* Pro Claims List */}
      <div className={CARD}>
        <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
          <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Pro Verification Queue
          </h3>
          <div className="flex items-center gap-1">
            {(["pending", "approved", "denied", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setProClaimsFilter(f); fetchProClaims(f); }}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold capitalize transition-all ${
                  proClaimsFilter === f
                    ? "bg-text-primary text-bg-card"
                    : "border border-border-subtle bg-transparent text-text-secondary hover:bg-bg-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {proClaimsLoading ? (
          <p className="text-xs text-text-secondary italic py-2">Loading requests…</p>
        ) : proClaims.length === 0 ? (
          <p className="text-xs text-text-secondary italic py-2">No {proClaimsFilter} Pro requests found.</p>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
            {proClaims.map((claim) => (
              <div
                key={claim.id}
                className={`flex items-start justify-between gap-4 rounded-lg border p-3.5 transition-colors ${
                  claim.status === "pending"
                    ? "border-amber-200 bg-amber-50/20"
                    : claim.status === "approved"
                    ? "border-[#bbf7d0] bg-[#f0fdf4]/20"
                    : "border-[#fecaca] bg-[#fef2f2]/20"
                }`}
              >
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      claim.status === "pending" ? "bg-amber-100 text-amber-700"
                      : claim.status === "approved" ? "bg-[#dcfce7] text-[#166534]"
                      : "bg-[#fee2e2] text-[#991b1b]"
                    }`}>
                      {claim.status}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary">
                      {claim.platform === "github" ? "🐙 GitHub" : "☕ BMAC"}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-text-primary truncate max-w-[260px]">
                    {claim.email || claim.displayName || claim.uid}
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    Handle: <span className="font-mono font-semibold text-text-primary">{claim.handle}</span>
                  </p>
                  {claim.note && (
                    <p className="text-[11px] text-text-muted italic mt-0.5">&ldquo;{claim.note}&rdquo;</p>
                  )}
                  <p className="text-[9.5px] font-mono text-text-muted">
                    {new Date(claim.submittedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>

                {claim.status === "pending" && (
                  <div className="shrink-0 flex flex-col gap-1.5 mt-0.5">
                    <button
                      disabled={proActionLoading === claim.id}
                      onClick={() => handleProAction(claim.id, "approve")}
                      className="rounded-md border border-[#16a34a] bg-[#16a34a] px-2.5 py-1 text-[10.5px] font-semibold text-white transition-all hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {proActionLoading === claim.id ? "…" : "Approve"}
                    </button>
                    <button
                      disabled={proActionLoading === claim.id}
                      onClick={() => handleProAction(claim.id, "deny")}
                      className="rounded-md border border-[#dc2626] bg-transparent px-2.5 py-1 text-[10.5px] font-semibold text-[#dc2626] transition-all hover:bg-[#dc2626] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {proActionLoading === claim.id ? "…" : "Deny"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
