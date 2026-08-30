"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [inputText, setInputText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || typeof window === "undefined") return null;

  const isConfirmed = inputText.trim() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    try {
      setIsDeleting(true);
      setErrorMessage("");
      await onConfirmDelete();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      <div
        className="m-4 flex w-full max-w-[420px] flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle animate-[fadeInScale_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        
        <div className="flex items-center gap-3 border-b border-border-subtle pb-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-primary text-text-primary">
            <Trash2 size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-primary">Delete Account &amp; Data</h3>
            <p className="text-[11.5px] text-text-muted">Permanent hard data purge</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-border-subtle bg-bg-primary/50 p-3 text-[12.5px] leading-relaxed text-text-muted">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-text-secondary" />
            <span>
              This will permanently delete your account and immediately purge all stored expenses, portfolios, watchlists, and subscriptions. <strong className="font-semibold text-text-primary">This action cannot be undone.</strong>
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[12px] font-medium text-text-muted">
              To confirm deletion, type <code className="rounded border border-border-subtle bg-bg-primary px-1.5 py-0.5 font-mono text-[11px] font-bold text-text-primary">DELETE</code> below:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isDeleting}
              className="w-full rounded-lg border border-border-subtle bg-bg-card px-3.5 py-2 font-mono text-[13px] text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-border-hover focus:shadow-focus"
              autoFocus
            />
          </div>

          {errorMessage && (
            <p className="text-[12px] font-medium text-red-600">{errorMessage}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-md border border-border-subtle bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
              isConfirmed && !isDeleting
                ? "bg-[#b3666b] text-white shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
                : "border border-border-subtle bg-bg-primary text-text-muted opacity-50 cursor-not-allowed"
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Deleting Account...</span>
              </>
            ) : (
              <span>Delete Account Permanently</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
