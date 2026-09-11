"use client";

import React, { useEffect } from "react";
import { Sparkles, X, ArrowRight, CheckCircle2 } from "lucide-react";
import type { ReleaseNote } from "@/types";

export interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  releaseNote: Partial<ReleaseNote> | null;
  isPreview?: boolean;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
  releaseNote,
  isPreview = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !releaseNote) return null;

  const dateStr = releaseNote.publishedAt
    ? new Date(releaseNote.publishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently Released";

  const lines = (releaseNote.content || "").split("\n");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-notes-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_both]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-2xl animate-[fadeInScale_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-6 pb-4 bg-bg-primary/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-text-secondary uppercase">
                  {isPreview ? "Release Preview" : "What's New"}
                </span>
                {releaseNote.version && (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {releaseNote.version}
                  </span>
                )}
                <span className="text-[11px] text-text-muted">
                  • {dateStr}
                </span>
              </div>
              <h2
                id="release-notes-title"
                className="mt-1 font-serif text-xl sm:text-2xl font-normal italic tracking-tight text-text-primary"
              >
                {releaseNote.title || "Latest Platform Updates"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 min-w-[32px] min-h-[32px] aspect-square p-0 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-muted transition-all duration-200 hover:bg-bg-primary hover:text-text-primary hover:border-border-hover shadow-2xs"
            aria-label="Close release notes"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[55vh]">
          {lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <div key={idx} className="h-2" />;
            }

            if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
              const headingText = trimmed.replace(/^#{2,3}\s+/, "");
              return (
                <h3
                  key={idx}
                  className="font-serif text-sm font-semibold tracking-tight text-text-primary mt-4 first:mt-0 flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {headingText}
                </h3>
              );
            }

            if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
              const itemText = trimmed.replace(/^[-*•]\s+/, "");
              const colonIdx = itemText.indexOf(":");
              const hasBoldPrefix = itemText.startsWith("**") && itemText.includes("**:");

              return (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-text-secondary leading-relaxed">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    {hasBoldPrefix ? (
                      <span>
                        <strong className="font-semibold text-text-primary">
                          {itemText.slice(2, itemText.indexOf("**", 2))}:
                        </strong>
                        {itemText.slice(itemText.indexOf("**:", 2) + 3)}
                      </span>
                    ) : colonIdx > 0 && colonIdx < 30 ? (
                      <span>
                        <strong className="font-semibold text-text-primary">
                          {itemText.slice(0, colonIdx)}:
                        </strong>
                        {itemText.slice(colonIdx + 1)}
                      </span>
                    ) : (
                      <span>{itemText}</span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <p key={idx} className="text-xs sm:text-[13px] text-text-secondary leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle p-5 sm:p-6 bg-bg-primary/20">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full cursor-pointer rounded-xl border border-text-primary bg-text-primary py-2.5 text-xs font-semibold text-bg-primary transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-xs"
          >
            <span>{isPreview ? "Close Preview" : "Got It, Explore Now"}</span>
            <ArrowRight size={14} />
          </button>
          <div className="flex items-center justify-center">
            <span className="text-[10px] text-text-muted font-mono tracking-wide">
              {isPreview
                ? "Admin live simulation mode"
                : "This release prompt is shown once per published update."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
