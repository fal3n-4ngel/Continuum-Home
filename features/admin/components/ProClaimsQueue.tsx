import React from "react";
import { ProClaim } from "@/types";
import { Star } from "lucide-react";

interface ProClaimsQueueProps {
  proClaims: ProClaim[];
  proClaimsLoading: boolean;
  proClaimsFilter: "pending" | "approved" | "denied" | "all";
  setProClaimsFilter: (f: "pending" | "approved" | "denied" | "all") => void;
  fetchProClaims: (filter: "pending" | "approved" | "denied" | "all") => void;
  proActionLoading: string | null;
  handleProAction: (id: string, action: "approve" | "deny") => void;
}

const CARD = "rounded-none border-2 border-border-subtle bg-bg-card p-6 shadow-subtle";

export const ProClaimsQueue: React.FC<ProClaimsQueueProps> = ({
  proClaims,
  proClaimsLoading,
  proClaimsFilter,
  setProClaimsFilter,
  fetchProClaims,
  proActionLoading,
  handleProAction,
}) => {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between border-b-2 border-border-subtle pb-3 mb-4">
        <h3 className="font-serif text-base font-medium italic text-text-primary flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Pro Verification Queue
        </h3>
        <div className="flex items-center gap-1">
          {(["pending", "approved", "denied", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setProClaimsFilter(f); fetchProClaims(f); }}
              className={`rounded-none px-2.5 py-1 text-[10px] font-semibold capitalize transition-all ${
                proClaimsFilter === f
                  ? "bg-text-primary text-bg-card"
                  : "border-2 border-border-subtle bg-transparent text-text-secondary hover:bg-bg-primary"
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
              className={`flex items-start justify-between gap-4 rounded-none border-2 p-3.5 transition-colors ${
                claim.status === "pending"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : claim.status === "approved"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10"
              }`}
            >
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                    claim.status === "pending" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : claim.status === "approved" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
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
                    className="rounded-none border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-[10.5px] font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {proActionLoading === claim.id ? "…" : "Approve"}
                  </button>
                  <button
                    disabled={proActionLoading === claim.id}
                    onClick={() => handleProAction(claim.id, "deny")}
                    className="rounded-none border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400 transition-all hover:bg-rose-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};
