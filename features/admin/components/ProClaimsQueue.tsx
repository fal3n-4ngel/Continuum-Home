import React, { useState, useMemo } from "react";
import { ProClaim, ProUserRecord } from "@/types";
import {
  Star,
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  UserMinus,
} from "lucide-react";

interface ProClaimsQueueProps {
  proClaims: ProClaim[];
  proClaimsLoading: boolean;
  proClaimsFilter: "pending" | "approved" | "denied" | "all";
  setProClaimsFilter: (f: "pending" | "approved" | "denied" | "all") => void;
  fetchProClaims: (filter?: "pending" | "approved" | "denied" | "all") => void;
  proActionLoading: string | null;
  handleProAction: (id: string, action: "approve" | "deny") => void;
  proUsers: ProUserRecord[];
  proUsersLoading: boolean;
  fetchProUsers: () => void;
  handleGrantPro: (emailOrUid: string) => Promise<{ success: boolean; error?: string }>;
  handleRevokePro: (uid: string) => Promise<void>;
}

const CARD = "rounded-none border-2 border-border-subtle bg-bg-card p-4 sm:p-6 shadow-subtle";

export const ProClaimsQueue: React.FC<ProClaimsQueueProps> = ({
  proClaims,
  proClaimsLoading,
  proClaimsFilter,
  setProClaimsFilter,
  fetchProClaims,
  proActionLoading,
  handleProAction,
  proUsers,
  proUsersLoading,
  fetchProUsers,
  handleGrantPro,
  handleRevokePro,
}) => {
  const [subTab, setSubTab] = useState<"pro-users" | "claims">("pro-users");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantInput, setGrantInput] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [revokingUser, setRevokingUser] = useState<ProUserRecord | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Filter pro users by search query
  const filteredProUsers = useMemo(() => {
    if (!searchQuery.trim()) return proUsers;
    const q = searchQuery.toLowerCase().trim();
    return proUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        u.uid.toLowerCase().includes(q) ||
        (u.claimSource?.handle && u.claimSource.handle.toLowerCase().includes(q))
    );
  }, [proUsers, searchQuery]);

  // Count pending claims
  const pendingCount = useMemo(
    () => proClaims.filter((c) => c.status === "pending").length,
    [proClaims]
  );

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const submitGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantInput.trim()) return;
    setGrantLoading(true);
    setGrantError(null);
    const res = await handleGrantPro(grantInput.trim());
    setGrantLoading(false);
    if (res.success) {
      setGrantInput("");
      setShowGrantModal(false);
    } else {
      setGrantError(res.error || "Failed to grant Pro access");
    }
  };

  const confirmRevoke = async () => {
    if (!revokingUser) return;
    setRevokeLoading(true);
    await handleRevokePro(revokingUser.uid);
    setRevokeLoading(false);
    setRevokingUser(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls & Navigation */}
      <div className={CARD}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border-subtle pb-4">
          <div className="flex flex-col">
            <h2 className="font-serif text-xl sm:text-2xl font-medium italic text-text-primary flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Pro Tier Management
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Active Firestore Pro subscribers and supporter verification queue.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                fetchProUsers();
                fetchProClaims(proClaimsFilter);
              }}
              disabled={proUsersLoading || proClaimsLoading}
              title="Refresh Pro Data"
              className="rounded-none border-2 border-border-subtle bg-bg-primary/40 p-2 text-text-secondary hover:text-text-primary hover:border-text-primary transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${proUsersLoading || proClaimsLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                setGrantError(null);
                setGrantInput("");
                setShowGrantModal(true);
              }}
              className="rounded-none border-2 border-text-primary bg-text-primary px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-bg-card hover:bg-bg-primary hover:text-text-primary transition-all flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Grant Pro</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 sm:gap-4 mt-4 overflow-x-auto no-scrollbar border-b-2 border-border-subtle/50 pb-2">
          <button
            onClick={() => setSubTab("pro-users")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[10px] ${
              subTab === "pro-users"
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Active Pro Users</span>
            <span className="rounded-none bg-text-primary/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-text-primary">
              {proUsers.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab("claims")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-[10px] ${
              subTab === "claims"
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Verification Queue</span>
            {pendingCount > 0 && (
              <span className="rounded-none bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-mono font-bold">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Sub-Tab 1: Active Pro Users in Firestore */}
        {subTab === "pro-users" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by email, handle, or UID..."
                  className="w-full rounded-none border-2 border-border-subtle bg-bg-primary pl-9 pr-3.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-text-primary font-mono"
                />
              </div>
              <div className="text-[11px] font-mono text-text-secondary shrink-0 self-end sm:self-auto">
                Showing <strong className="text-text-primary">{filteredProUsers.length}</strong> of {proUsers.length} users with <code className="bg-bg-primary px-1 py-0.5 border border-border-subtle">isPro: true</code>
              </div>
            </div>

            {proUsersLoading ? (
              <div className="py-12 text-center text-xs text-text-secondary font-mono flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-text-primary" />
                <span>Loading active Pro users from Firestore…</span>
              </div>
            ) : filteredProUsers.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border-subtle p-6">
                <Star className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="font-serif text-base italic text-text-primary">
                  {searchQuery ? "No matching Pro users found." : "No active Pro users found in Firestore."}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Approve a verification claim or use 'Grant Pro' above to activate a Pro account."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredProUsers.map((proUser) => (
                  <div
                    key={proUser.uid}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary/60 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-none bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold font-mono text-sm mt-0.5">
                        {proUser.displayName?.[0]?.toUpperCase() || proUser.email?.[0]?.toUpperCase() || "P"}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-text-primary truncate">
                            {proUser.email}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                            ★ PRO ACTIVE
                          </span>
                        </div>

                        {proUser.displayName && (
                          <span className="text-xs text-text-secondary truncate mt-0.5">
                            {proUser.displayName}
                          </span>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-text-secondary flex-wrap">
                          <button
                            onClick={() => handleCopyUid(proUser.uid)}
                            className="inline-flex items-center gap-1 text-[10px] hover:text-text-primary transition-colors bg-bg-card px-1.5 py-0.5 border border-border-subtle cursor-pointer"
                            title="Click to copy UID"
                          >
                            <span>UID: {proUser.uid.slice(0, 12)}…</span>
                            {copiedUid === proUser.uid ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-text-muted" />
                            )}
                          </button>

                          {proUser.claimSource ? (
                            <span className="inline-flex items-center gap-1 text-text-primary">
                              {proUser.claimSource.platform === "github" ? "🐙 GitHub" : "☕ BMAC"}:
                              <strong className="underline underline-offset-2">@{proUser.claimSource.handle}</strong>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-text-muted">
                              <Sparkles className="h-3 w-3 text-amber-500" />
                              <span>Direct Admin Grant</span>
                            </span>
                          )}

                          {proUser.proSince && (
                            <span className="text-text-muted">
                              Active since: {new Date(proUser.proSince).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle/50 w-full md:w-auto justify-end">
                      <button
                        onClick={() => setRevokingUser(proUser)}
                        className="rounded-none border-2 border-border-subtle bg-transparent px-3 py-1 text-xs font-semibold text-[#dc2626] hover:bg-[#fef2f2] hover:border-[#dc2626] transition-all flex items-center gap-1.5"
                      >
                        <UserMinus className="h-3 w-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sub-Tab 2: Verification Queue (Claims) */}
        {subTab === "claims" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border-subtle pb-3">
              <span className="text-xs font-serif italic text-text-secondary">
                Review and resolve Pro verification requests submitted by users.
              </span>
              <div className="inline-flex border-2 border-border-subtle p-0.5 bg-bg-primary overflow-x-auto self-start sm:self-auto">
                {(["pending", "approved", "denied", "all"] as const).map((f) => {
                  const count = proClaims.filter((c) => f === "all" || c.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        setProClaimsFilter(f);
                        fetchProClaims(f);
                      }}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        proClaimsFilter === f
                          ? "bg-text-primary text-bg-card"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <span>{f}</span>
                      <span className={`text-[9px] px-1 rounded-sm ${
                        proClaimsFilter === f
                          ? "bg-bg-card/30 text-bg-card"
                          : "bg-border-subtle text-text-muted"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {proClaimsLoading ? (
              <div className="py-12 text-center text-xs text-text-secondary font-mono flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-text-primary" />
                <span>Loading verification claims…</span>
              </div>
            ) : proClaims.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border-subtle p-6">
                <Clock className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="font-serif text-base italic text-text-primary">
                  No {proClaimsFilter} Pro requests found.
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  New supporter verification claims will appear in this queue.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {proClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 border-2 border-border-subtle bg-bg-primary/20 hover:border-text-primary/60 transition-all"
                  >
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wide border ${
                            claim.status === "pending"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                              : claim.status === "approved"
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40"
                          }`}
                        >
                          {claim.status === "approved" && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {claim.status === "denied" && <XCircle className="h-2.5 w-2.5" />}
                          {claim.status === "pending" && <Clock className="h-2.5 w-2.5" />}
                          <span>{claim.status}</span>
                        </span>

                        <span className="text-[11px] font-mono text-text-primary font-semibold">
                          {claim.platform === "github" ? "🐙 GitHub Supporter" : "☕ Buy Me A Coffee"}
                        </span>

                        <span className="text-[10px] font-mono text-text-muted">
                          {new Date(claim.submittedAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-sm font-semibold text-text-primary truncate">
                          {claim.email || claim.displayName || claim.uid}
                        </p>
                        <p className="text-xs text-text-secondary font-mono">
                          Handle: <strong className="text-text-primary">@{claim.handle}</strong>
                        </p>
                      </div>

                      {claim.note && (
                        <div className="mt-1 border-l-2 border-border-subtle bg-bg-card px-3 py-1.5 text-xs text-text-secondary italic">
                          &ldquo;{claim.note}&rdquo;
                        </div>
                      )}
                    </div>

                    {claim.status === "pending" && (
                      <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border-subtle/50 w-full md:w-auto justify-end">
                        <button
                          disabled={proActionLoading === claim.id}
                          onClick={() => handleProAction(claim.id, "approve")}
                          className="rounded-none border-2 border-emerald-600 bg-emerald-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-700 transition-all disabled:opacity-50"
                        >
                          {proActionLoading === claim.id ? "…" : "Approve Pro"}
                        </button>
                        <button
                          disabled={proActionLoading === claim.id}
                          onClick={() => handleProAction(claim.id, "deny")}
                          className="rounded-none border-2 border-border-subtle bg-transparent px-3 py-1.5 text-xs font-semibold text-[#dc2626] hover:bg-[#fef2f2] hover:border-[#dc2626] transition-all disabled:opacity-50"
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
        )}
      </div>

      {/* Grant Pro Modal */}
      {showGrantModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px] p-4"
          onClick={() => setShowGrantModal(false)}
        >
          <div
            className="relative w-full max-w-[440px] rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b-2 border-border-subtle pb-3">
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
              <h3 className="font-serif text-lg font-medium italic text-text-primary">
                Grant Pro Access Directly
              </h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Directly activate Pro tier in Firestore settings for a user. Bypasses the supporter verification queue and invalidates cache instantly.
            </p>

            <form onSubmit={submitGrant} className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">
                  User Email or Firebase UID
                </label>
                <input
                  type="text"
                  required
                  value={grantInput}
                  onChange={(e) => setGrantInput(e.target.value)}
                  placeholder="e.g. user@gmail.com or 79344832..."
                  className="w-full rounded-none border-2 border-border-subtle bg-bg-primary px-3.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-text-primary font-mono"
                />
              </div>

              {grantError && (
                <div className="rounded-none bg-rose-500/10 border-2 border-rose-500/30 p-2.5 text-xs text-[#dc2626] font-mono">
                  {grantError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t-2 border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="rounded-none border-2 border-border-subtle bg-transparent px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grantLoading || !grantInput.trim()}
                  className="rounded-none border-2 border-text-primary bg-text-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-bg-card hover:bg-bg-primary hover:text-text-primary transition-all disabled:opacity-50"
                >
                  {grantLoading ? "Activating…" : "Grant Pro Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Pro Confirmation Modal */}
      {revokingUser && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-text-primary/40 backdrop-blur-[4px] p-4"
          onClick={() => setRevokingUser(null)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 border-2 border-[#dc2626]/30 bg-[#fef2f2] text-[#dc2626]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-serif text-lg font-medium italic text-text-primary">
                  Revoke Pro Access
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Are you sure you want to revoke Pro tier for <strong className="text-text-primary font-mono">{revokingUser.email}</strong>?
                </p>
              </div>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed border-t border-b border-border-subtle py-2.5 font-mono">
              This will set <code className="text-text-primary">isPro: false</code> in Firestore and remove their access to Pro analytics and historical spend intelligence.
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => setRevokingUser(null)}
                className="rounded-none border-2 border-border-subtle bg-transparent px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevoke}
                disabled={revokeLoading}
                className="rounded-none border-2 border-[#dc2626] bg-[#dc2626] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-white hover:text-[#dc2626] transition-all disabled:opacity-50"
              >
                {revokeLoading ? "Revoking…" : "Yes, Revoke Pro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
