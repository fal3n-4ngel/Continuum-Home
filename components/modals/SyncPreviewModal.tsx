import React from "react";

export interface SyncPreviewItem {
  title: string;
  type: string;
  changes: string[];
}

export interface SyncPreviewState {
  isOpen: boolean;
  title: string;
  newItems: SyncPreviewItem[];
  updatedItems: SyncPreviewItem[];
  onConfirm: () => void;
  isApplying?: boolean;
}

interface SyncPreviewModalProps {
  preview: SyncPreviewState;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  movie: "🎬",
  show: "📺",
  anime: "🌸",
  book: "📚",
};

export const SyncPreviewModal: React.FC<SyncPreviewModalProps> = ({ preview, onClose }) => {
  if (!preview.isOpen) return null;

  const total = preview.newItems.length + preview.updatedItems.length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="m-4 flex max-h-[80vh] w-full max-w-[480px] flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle animate-[fadeInScale_0.15s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }`}</style>

        <div>
          <p className="text-[15px] font-bold">{preview.title}</p>
          <p className="mt-1 text-xs text-text-muted">
            {preview.newItems.length} new · {preview.updatedItems.length} update{preview.updatedItems.length === 1 ? "" : "s"} · {total} total
          </p>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {preview.newItems.length > 0 && (
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.5px] text-[#16a34a] uppercase">New ({preview.newItems.length})</span>
              <div className="flex flex-col gap-1">
                {preview.newItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-[#f0fdf4] px-2.5 py-1.5 text-[12px]">
                    <span>{TYPE_LABEL[item.type] || "•"}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-text-primary" title={item.title}>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.updatedItems.length > 0 && (
            <div>
              <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.5px] text-[#b45309] uppercase">Updated ({preview.updatedItems.length})</span>
              <div className="flex flex-col gap-1">
                {preview.updatedItems.map((item, i) => (
                  <div key={i} className="rounded-md bg-[#fffbeb] px-2.5 py-1.5">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span>{TYPE_LABEL[item.type] || "•"}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-text-primary" title={item.title}>{item.title}</span>
                    </div>
                    <ul className="mt-0.5 ml-6 list-disc text-[10.5px] text-text-secondary">
                      {item.changes.map((c, ci) => (
                        <li key={ci}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="p-4 text-center text-[13px] text-text-muted">Nothing to sync.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border-subtle pt-3.5">
          <button
            className="cursor-pointer rounded-md border border-border-subtle bg-transparent px-4 py-2 text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="cursor-pointer rounded-lg bg-text-primary px-[18px] py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-[#2e2d27] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={preview.onConfirm}
            disabled={preview.isApplying || total === 0}
          >
            {preview.isApplying ? "Applying..." : `Apply ${total} change${total === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
};
