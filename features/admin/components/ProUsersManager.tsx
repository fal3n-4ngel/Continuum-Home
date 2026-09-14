"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProGrant } from "@/types";
import { Sparkles, UserPlus, RefreshCw, ShieldAlert, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface ProUsersManagerProps {
  idToken: string;
}

const CARD = "rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-subtle";

export const ProUsersManager: React.FC<ProUsersManagerProps> = ({ idToken }) => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [proUsers, setProUsers] = useState<ProGrant[]>([]);
  const [projectInfo, setProjectInfo] = useState<{ projectId: string; environment: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
    return headers;
  }, [idToken]);

  const fetchProUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pro-users", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProUsers(data.proUsers || []);
        if (data.projectId) {
          setProjectInfo({ projectId: data.projectId, environment: data.environment || "production" });
        }
      }
    } catch (err) {
      console.error("Failed to load pro users:", err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchProUsers();
  }, [fetchProUsers]);

  const handleGrantPro = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/pro-users", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: "success",
          text: data.message || `Pro access successfully granted to ${cleanEmail}!`,
        });
        setEmail("");
        fetchProUsers();
      } else {
        setFeedback({
          type: "error",
          text: data.error || "Failed to grant Pro access.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Network error occurred while granting Pro access.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokePro = async (targetEmail: string) => {
    if (!window.confirm(`Are you sure you want to revoke Pro privileges for ${targetEmail}?`)) {
      return;
    }

    setActionLoading(targetEmail);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/pro-users", {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedback({
          type: "info",
          text: data.message || `Pro access revoked for ${targetEmail}.`,
        });
        fetchProUsers();
      } else {
        setFeedback({
          type: "error",
          text: data.error || "Failed to revoke Pro access.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        text: "Network error occurred while revoking Pro access.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = proUsers.filter((u) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.uid && u.uid.toLowerCase().includes(q));
  });

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between border-b-2 border-border-subtle pb-3 mb-5">
        <div>
          <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" /> Pro Member Management
          </h3>
          <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Grant permanent Pro access to users by email address.</span>
            {projectInfo?.projectId && (
              <span className="font-mono text-[9.5px] text-text-muted bg-bg-primary px-1.5 py-0.5 border border-border-subtle">
                {projectInfo.environment} • {projectInfo.projectId}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchProUsers}
          disabled={loading}
          title="Refresh list"
          className="rounded-none border-2 border-border-subtle p-1.5 text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-none border-2 p-3 text-xs mb-4 flex items-start gap-2.5 transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : feedback.type === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "border-border-subtle bg-bg-primary text-text-primary"
          }`}
        >
          {feedback.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
          {feedback.type === "error" && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          {feedback.type === "info" && <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
          <div className="leading-snug">{feedback.text}</div>
        </div>
      )}

      {/* Add Pro User Form */}
      <form onSubmit={handleGrantPro} className="mb-6 flex flex-col gap-2.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Add Pro User by Email
        </label>
        <div className="flex gap-2 max-sm:flex-col">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="flex-1 rounded-none border-2 border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="shrink-0 flex items-center justify-center gap-1.5 rounded-none border-2 border-text-primary bg-text-primary px-4 py-2 text-xs font-semibold text-bg-card transition-all hover:bg-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {submitting ? "Granting…" : "Grant Pro Access"}
          </button>
        </div>
        <p className="text-[10.5px] text-text-muted italic">
          💡 Existing users will have Pro features activated immediately. If the user hasn&apos;t signed up yet, Pro privileges will activate automatically upon their first registration.
        </p>
      </form>

      {/* Pro Users List */}
      <div className="border-t-2 border-border-subtle pt-4">
        <div className="flex items-center justify-between mb-3 gap-2 max-sm:flex-col max-sm:items-start">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Granted Pro Members ({proUsers.filter((u) => u.status !== "revoked").length})
          </div>
          {proUsers.length > 5 && (
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search members…"
              className="rounded-none border border-border-subtle bg-bg-primary px-2.5 py-1 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          )}
        </div>

        {loading && proUsers.length === 0 ? (
          <p className="text-xs text-text-secondary italic py-3">Loading Pro members…</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-xs text-text-secondary italic py-3">
            {proUsers.length === 0 ? "No Pro members granted yet." : "No matching members found."}
          </p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredUsers.map((grant) => (
              <div
                key={grant.id || grant.email}
                className={`flex items-center justify-between gap-3 rounded-none border-2 p-3 transition-colors ${
                  grant.status === "active"
                    ? "border-border-subtle bg-bg-primary/40"
                    : grant.status === "pending_registration"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-border-subtle bg-bg-primary/20 opacity-60"
                }`}
              >
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {grant.email}
                    </span>
                    <span
                      className={`rounded-none px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${
                        grant.status === "active"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : grant.status === "pending_registration"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {grant.status === "pending_registration" ? "Invited (Pending)" : grant.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    {grant.uid && <span className="font-mono">UID: {grant.uid.slice(0, 10)}…</span>}
                    <span>•</span>
                    <span>
                      Granted: {new Date(grant.grantedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                    {grant.source && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{grant.source.replace("_", " ")}</span>
                      </>
                    )}
                  </div>
                </div>

                {grant.status !== "revoked" && (
                  <button
                    disabled={actionLoading === grant.email}
                    onClick={() => handleRevokePro(grant.email)}
                    title="Revoke Pro Access"
                    className="shrink-0 rounded-none border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-600 hover:text-white disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
