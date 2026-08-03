"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AUTHOR } from "@/lib/site";

interface ClaimProModalProps {
  isOpen: boolean;
  onClose: () => void;
  idToken: string;
}

type Platform = "github" | "bmac";
type SubmitState = "idle" | "loading" | "success" | "error" | "already_pending";

export function ClaimProModal({ isOpen, onClose, idToken }: ClaimProModalProps) {
  const [platform, setPlatform] = useState<Platform>("github");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setSubmitState("idle");
      setErrorMsg("");
      setHandle("");
      setNote("");
      setPlatform("github");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setSubmitState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/pro-claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ platform, handle: handle.trim(), note: note.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) { setSubmitState("already_pending"); return; }
      if (!res.ok) throw new Error(data.error || "Submission failed. Please try again.");
      setSubmitState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
      setSubmitState("error");
    }
  };

  if (!isOpen || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "rgba(26,26,26,0.45)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] sm:w-[460px] sm:max-w-[92vw] border-x border-t border-border-subtle sm:border bg-bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.1)] sm:shadow-[0_16px_48px_rgba(0,0,0,0.12)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border-subtle" />
        </div>

        {/* Thin accent bar at top */}
        <div className="h-[2px] w-full bg-text-primary" />

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-border-subtle">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[1.2px] text-text-muted mb-1.5">Pro Access</p>
            <h2 className="font-serif text-[22px] italic font-medium text-text-primary leading-tight">
              Claim your upgrade
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-text-muted transition-all hover:border-border-subtle hover:text-text-primary"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-6">
          {submitState === "success" ? (
            /* ─── Success ─── */
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-text-primary">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-serif text-base italic font-medium text-text-primary">Request received</p>
                <p className="text-[12px] text-text-secondary leading-relaxed max-w-[300px]">
                  We&apos;ll verify your support and activate Pro on your account — usually within a day.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-text-primary bg-text-primary px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2e2d27]"
              >
                Close
              </button>
            </div>
          ) : submitState === "already_pending" ? (
            /* ─── Already pending ─── */
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-serif text-base italic font-medium text-text-primary">Already in review</p>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  You have a pending request. We&apos;ll be in touch soon.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-text-primary bg-text-primary px-6 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2e2d27]"
              >
                Close
              </button>
            </div>
          ) : (
            /* ─── Form ─── */
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Pro perks — minimal list */}
              <div className="flex flex-col gap-2 rounded-[8px] border border-border-subtle bg-bg-primary px-4 py-3.5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted mb-0.5">Included with Pro</p>
                {[
                  "Financial Health tab with pay-cycle budgeting",
                  "Kiroku AI assistant in your dashboard",
                  "Priority support & early access to new features",
                ].map((perk) => (
                  <div key={perk} className="flex items-start gap-2.5 text-[12px] text-text-secondary">
                    <span className="mt-0.5 shrink-0 text-text-muted">—</span>
                    <span>{perk}</span>
                  </div>
                ))}
              </div>

              {/* Sponsor links */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-text-secondary">Support the project first</p>
                <div className="flex gap-2">
                  <a
                    href={AUTHOR.sponsorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border-subtle bg-transparent py-2 text-[11.5px] font-medium text-text-secondary no-underline transition-all hover:border-border-hover hover:text-text-primary"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-text-muted">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                    GitHub Sponsors
                  </a>
                  <a
                    href={AUTHOR.coffeeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border-subtle bg-transparent py-2 text-[11.5px] font-medium text-text-secondary no-underline transition-all hover:border-border-hover hover:text-text-primary"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                    </svg>
                    Buy Me a Coffee
                  </a>
                </div>
              </div>

              {/* Platform toggle */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-text-secondary">Where did you support?</p>
                <div className="flex gap-1.5 rounded-[8px] border border-border-subtle bg-bg-primary p-1">
                  {(["github", "bmac"] as Platform[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`flex-1 rounded-[6px] py-1.5 text-[11.5px] font-medium transition-all ${
                        platform === p
                          ? "bg-text-primary text-white shadow-sm"
                          : "bg-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {p === "github" ? "GitHub Sponsors" : "Buy Me a Coffee"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Handle */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pro-handle" className="text-[11px] font-semibold text-text-secondary">
                  {platform === "github" ? "GitHub username" : "Supporter email"}
                </label>
                <input
                  id="pro-handle"
                  type={platform === "bmac" ? "email" : "text"}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={platform === "github" ? "e.g. fal3n-4ngel" : "e.g. you@email.com"}
                  required
                  className="rounded-[8px] border border-border-subtle bg-bg-primary px-3.5 py-2.5 text-[13px] text-text-primary placeholder-text-muted outline-none transition-all focus:border-border-hover focus:shadow-focus"
                />
                <p className="text-[10.5px] text-text-muted">
                  {platform === "github"
                    ? "We'll match this against our GitHub Sponsors list."
                    : "We'll match this to the email on your BMAC payment."}
                </p>
              </div>

              {/* Note (optional) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pro-note" className="text-[11px] font-semibold text-text-secondary">
                  Additional note <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <textarea
                  id="pro-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything that helps us verify — date, amount, etc."
                  rows={2}
                  className="resize-none rounded-[8px] border border-border-subtle bg-bg-primary px-3.5 py-2.5 text-[13px] text-text-primary placeholder-text-muted outline-none transition-all focus:border-border-hover focus:shadow-focus"
                />
              </div>

              {/* Error */}
              {submitState === "error" && (
                <p className="text-[11.5px] text-[#b3666b]">{errorMsg}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md border border-border-subtle bg-transparent py-2.5 text-xs font-medium text-text-secondary transition-all hover:bg-bg-primary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitState === "loading" || !handle.trim()}
                  className="flex-1 rounded-md border border-text-primary bg-text-primary py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#2e2d27] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitState === "loading" ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
