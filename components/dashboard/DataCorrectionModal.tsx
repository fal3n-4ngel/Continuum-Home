import React, { useState, useMemo } from "react";
import { X, Check, AlertCircle, Layers } from "lucide-react";
import { WatchlistItem } from "@/types";

interface DataCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchlistItem[];
  onSuccess: () => void;
  getHeaders: () => Record<string, string>;
  triggerAlert: (title: string, message: string, type?: "success" | "danger" | "info", confirmText?: string) => void;
}

function normalizeTitle(title: string): string {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const DataCorrectionModal: React.FC<DataCorrectionModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  onSuccess,
  getHeaders,
  triggerAlert,
}) => {
  const [isMerging, setIsMerging] = useState<string | null>(null); // group key

  // Group items by normalized title and type
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, WatchlistItem[]> = {};
    for (const item of watchlist) {
      if (!item.title || !item.type) continue;
      const key = `${item.type}:${normalizeTitle(item.title)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    
    // Only return groups that actually have duplicates (length > 1)
    return Object.entries(groups)
      .filter(([_, items]) => items.length > 1)
      .map(([key, items]) => ({ key, items }));
  }, [watchlist]);

  const handleMerge = async (groupKey: string, items: WatchlistItem[]) => {
    if (items.length < 2) return;
    setIsMerging(groupKey);

    try {
      // Pick the "primary" item - prioritize items that have external IDs, then higher progress
      const sorted = [...items].sort((a, b) => {
        const aScore = (a.anilistId ? 100 : 0) + (a.traktId ? 100 : 0) + Number(a.progress || 0);
        const bScore = (b.anilistId ? 100 : 0) + (b.traktId ? 100 : 0) + Number(b.progress || 0);
        return bScore - aScore;
      });

      const primary = sorted[0];
      const duplicates = sorted.slice(1);

      // Construct merged data by taking the best attributes from all
      const mergedData: Partial<WatchlistItem> = { ...primary };
      for (const dup of duplicates) {
        if (!mergedData.anilistId && dup.anilistId) mergedData.anilistId = dup.anilistId;
        if (!mergedData.traktId && dup.traktId) mergedData.traktId = dup.traktId;
        if (!mergedData.coverImage && dup.coverImage) mergedData.coverImage = dup.coverImage;
        if (!mergedData.year && dup.year) mergedData.year = dup.year;
        if (!mergedData.totalEpisodes && dup.totalEpisodes) mergedData.totalEpisodes = dup.totalEpisodes;
        // Keep highest progress
        if (Number(dup.progress || 0) > Number(mergedData.progress || 0)) {
          mergedData.progress = dup.progress;
          mergedData.status = dup.status; // inherit status of the highest progress
        }
      }

      const duplicateIds = duplicates.map(d => d.id);

      const res = await fetch("/api/watchlist/deduplicate", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ primaryId: primary.id, duplicateIds, mergedData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to merge items");
      }

      triggerAlert("Merge Successful", `Successfully merged ${items.length} duplicate entries for "${primary.title}".`, "success");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      triggerAlert("Merge Failed", err.message, "danger");
    } finally {
      setIsMerging(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <Layers className="h-5 w-5 text-text-secondary" />
              Data Correction
            </h2>
            <p className="text-sm text-text-secondary">
              Automatically identify and merge duplicate watchlist items caused by sync or manual entry overlaps.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <Check className="h-6 w-6" />
              </div>
              <p className="font-semibold text-text-primary">Library is Clean</p>
              <p className="text-sm text-text-secondary">No duplicate items were detected in your watchlist.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg bg-orange-500/10 p-3 text-orange-500 mb-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed">
                  Found <strong>{duplicateGroups.length}</strong> duplicate group(s). Merging will combine their external links, cover art, and preserve the highest watch progress.
                </p>
              </div>

              {duplicateGroups.map(({ key, items }) => (
                <div key={key} className="rounded-lg border border-border-subtle bg-bg-primary/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary">{items[0].title} <span className="text-text-secondary text-xs uppercase ml-2 tracking-wider">({items[0].type})</span></h3>
                    <button
                      onClick={() => handleMerge(key, items)}
                      disabled={isMerging === key}
                      className="rounded-md border border-text-primary bg-text-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {isMerging === key ? "Merging..." : "Merge Group"}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded bg-bg-card px-3 py-2 text-[13px] border border-border-subtle/50">
                        <div className="flex items-center gap-3">
                          {item.coverImage ? (
                            <img src={item.coverImage} alt="Cover" className="h-8 w-6 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-6 rounded bg-bg-primary" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-text-primary">{item.title}</span>
                            <span className="text-[11px] text-text-secondary">
                              {item.status} • {item.progress || 0}{item.totalEpisodes ? `/${item.totalEpisodes}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {item.anilistId && <span className="rounded bg-[#2b2d42] px-1.5 py-0.5 text-[10px] font-bold text-white">AL</span>}
                          {item.traktId && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">TRK</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
