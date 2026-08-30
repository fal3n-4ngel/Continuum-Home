import React from "react";
import { createPortal } from "react-dom";

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: "confirm" | "alert";
  tone?: "danger" | "success" | "info";
}

interface ConfirmModalProps {
  confirmDlg: ConfirmState;
  setConfirmDlg: React.Dispatch<React.SetStateAction<ConfirmState>>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ confirmDlg, setConfirmDlg }) => {
  if (!confirmDlg.isOpen || typeof window === "undefined") return null;

  const isAlert = confirmDlg.variant === "alert";
  const tone = confirmDlg.tone || (confirmDlg.isDestructive !== false ? "danger" : "info");

  const iconBg = tone === "danger" ? "rgba(179,102,107,0.12)" : tone === "success" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)";
  const strokeColor = tone === "danger" ? "#b3666b" : tone === "success" ? "#16a34a" : "#2563eb";
  const confirmBtnBg = tone === "danger" ? "#b3666b" : tone === "success" ? "#16a34a" : "var(--text-primary)";

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      onClick={() => setConfirmDlg((prev) => ({ ...prev, isOpen: false }))}
    >
      <div
        className="m-4 flex w-full max-w-[400px] flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-7 shadow-subtle animate-[fadeInScale_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: iconBg }}>
            {tone === "danger" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            )}
            {tone === "success" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
            {tone === "info" && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[15px] font-bold">{confirmDlg.title}</p>
            <p className="text-[13px] leading-normal text-text-secondary">{confirmDlg.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {!isAlert && (
            <button
              className="rounded-md border border-border-subtle bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary active:scale-95 cursor-pointer"
              onClick={() => setConfirmDlg((prev) => ({ ...prev, isOpen: false }))}
            >
              {confirmDlg.cancelText || "Cancel"}
            </button>
          )}
          <button
            className="rounded-lg px-[18px] py-2 text-[13px] font-semibold text-white transition-all active:scale-95 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: confirmBtnBg }}
            onClick={confirmDlg.onConfirm}
          >
            {confirmDlg.confirmText || (isAlert ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
