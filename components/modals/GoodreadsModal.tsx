import React, { useState, useRef } from "react";
import { X, BookOpen, Upload, Rss, HelpCircle, Loader2 } from "lucide-react";

interface GoodreadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  setUserId: (id: string) => void;
  onRssSync: () => void;
  onCsvImport: (file: File) => void;
  isSyncing: boolean;
}

export const GoodreadsModal: React.FC<GoodreadsModalProps> = ({
  isOpen,
  onClose,
  userId,
  setUserId,
  onRssSync,
  onCsvImport,
  isSyncing,
}) => {
  const [activeTab, setActiveTab] = useState<"rss" | "csv">("rss");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
      }
    }
  };

  const handleCsvSubmit = () => {
    if (selectedFile) {
      onCsvImport(selectedFile);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm apple-backdrop-fade"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[480px] flex-col gap-4 rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle apple-modal-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#543b23]/10 text-[#785433] dark:bg-[#785433]/20 dark:text-[#d4ba9f] border border-[#785433]/20">
              <BookOpen size={17} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Goodreads Integration</h2>
              <p className="text-[11px] text-text-muted">Sync shelves via RSS or backfill from CSV export.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-xs border border-border-subtle bg-bg-secondary text-text-muted hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-md border border-border-subtle bg-bg-secondary/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("rss")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-xs transition-all cursor-pointer ${
              activeTab === "rss"
                ? "bg-bg-card text-text-primary shadow-2xs font-semibold"
                : "text-text-muted hover:text-text-primary bg-transparent"
            }`}
          >
            <Rss size={13} />
            Live RSS Sync
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-xs transition-all cursor-pointer ${
              activeTab === "csv"
                ? "bg-bg-card text-text-primary shadow-2xs font-semibold"
                : "text-text-muted hover:text-text-primary bg-transparent"
            }`}
          >
            <Upload size={13} />
            CSV Library Import
          </button>
        </div>

        {/* Tab 1: Live RSS Sync */}
        {activeTab === "rss" && (
          <div className="flex flex-col gap-3.5">
            <p className="text-xs leading-relaxed text-text-secondary">
              Enter your Goodreads User ID to sync your <strong className="text-text-primary">Reading</strong>, <strong className="text-text-primary">Completed</strong>, and <strong className="text-text-primary">To Read</strong> shelves directly from your public RSS feeds.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Goodreads User ID or Profile URL
              </label>
              <input
                type="text"
                placeholder="e.g. 12345678 or goodreads.com/user/show/12345678-name"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-sm border border-border-subtle bg-bg-primary px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus"
              />
            </div>

            <div className="flex items-start gap-2 rounded-sm border border-border-subtle surface-container-subtle p-2.5 text-[11px] text-text-muted">
              <HelpCircle size={14} className="shrink-0 mt-0.5 text-text-secondary" />
              <span>
                To find your User ID, visit <strong className="text-text-primary">goodreads.com</strong>, click your profile picture, and copy the number from the address bar (e.g. <code className="font-mono text-[10px] bg-bg-card px-1 py-0.5 rounded-xs border border-border-subtle">.../user/show/<strong>12345678</strong>-username</code>).
              </span>
            </div>

            <div className="mt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-8.5 cursor-pointer rounded-sm border border-border-subtle bg-transparent px-4 text-xs font-mono uppercase tracking-wider text-text-primary transition-all duration-200 hover:bg-bg-secondary shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRssSync}
                disabled={isSyncing || !userId.trim()}
                className="h-8.5 flex items-center gap-1.5 cursor-pointer rounded-sm border border-text-primary bg-text-primary px-5 text-xs font-mono uppercase tracking-wider text-bg-primary transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync Shelves"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: CSV Import */}
        {activeTab === "csv" && (
          <div className="flex flex-col gap-3.5">
            <p className="text-xs leading-relaxed text-text-secondary">
              Goodreads RSS feeds only list recent updates. For your full lifetime reading history, download your export file from <strong className="text-text-primary">Goodreads &rarr; My Books &rarr; Export Library</strong>.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-text-primary bg-bg-secondary/70"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border-subtle bg-bg-secondary/30 hover:bg-bg-secondary/60"
              }`}
            >
              <Upload size={22} className={selectedFile ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"} />
              {selectedFile ? (
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-text-primary">{selectedFile.name}</p>
                  <p className="text-[10px] text-text-muted font-mono">{(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change</p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-text-primary">Drop your <code className="font-mono text-[11px]">.csv</code> export here</p>
                  <p className="text-[11px] text-text-muted">or click to browse your files</p>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-8.5 cursor-pointer rounded-sm border border-border-subtle bg-transparent px-4 text-xs font-mono uppercase tracking-wider text-text-primary transition-all duration-200 hover:bg-bg-secondary shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvSubmit}
                disabled={isSyncing || !selectedFile}
                className="h-8.5 flex items-center gap-1.5 cursor-pointer rounded-sm border border-text-primary bg-text-primary px-5 text-xs font-mono uppercase tracking-wider text-bg-primary transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Parsing...
                  </>
                ) : (
                  "Import CSV"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
