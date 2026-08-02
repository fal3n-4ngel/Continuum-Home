import React from "react";
import { WatchlistItem } from "@/types";

interface IntegrationsTabProps {
  watchlist: WatchlistItem[];
  showLetterboxdModal: boolean;
  setShowLetterboxdModal: (show: boolean) => void;
  letterboxdUsername: string;
  setLetterboxdUsername: (s: string) => void;
  handleLetterboxdImport: () => void;
  isImportingLetterboxd: boolean;
  disconnectLetterboxd: () => void;
  anilistUser?: any;
  connectAnilist?: () => void;
  disconnectAnilist?: () => void;
  syncAnilist?: () => void;
  isSyncingAnilist?: boolean;
  traktUser?: any;
  connectTrakt?: () => void;
  disconnectTrakt?: () => void;
  syncTrakt?: () => void;
  isSyncingTrakt?: boolean;
}

const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:opacity-60";
const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary";

export const IntegrationsTab = ({
  watchlist,
  showLetterboxdModal,
  setShowLetterboxdModal,
  letterboxdUsername,
  setLetterboxdUsername,
  handleLetterboxdImport,
  isImportingLetterboxd,
  disconnectLetterboxd,
  anilistUser,
  connectAnilist,
  disconnectAnilist,
  syncAnilist,
  isSyncingAnilist,
  traktUser,
  connectTrakt,
  disconnectTrakt,
  syncTrakt,
  isSyncingTrakt,
}: IntegrationsTabProps) => {
  const exportLetterboxdCSV = () => {
    const movies = watchlist.filter((item) => item.type === "movie" && item.status === "completed");
    if (movies.length === 0) return alert("No completed movies to export.");

    let csvContent = "Title,Year,Rating10,WatchedDate\n";
    movies.forEach((m) => {
      const title = m.title.replace(/"/g, '""');
      const year = m.year || "";
      const rating = m.rating || "";
      const watched = m.createdAt ? new Date(m.createdAt).toISOString().split("T")[0] : "";
      csvContent += `"${title}",${year},${rating},${watched}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `letterboxd_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]"><h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-2">Integrations</h1>
      <div className="grid grid-cols-4 gap-5 max-xl:grid-cols-2 max-sm:grid-cols-2 max-sm:gap-3">
        {/* AniList Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 max-sm:p-3.5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5 max-sm:flex-col max-sm:gap-2">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.05)] bg-[#1e2630]">
              <svg viewBox="0 0 512 512" className="h-full w-full">
                <path d="M0 0h512v512H0" fill="#1e2630"/>
                <path d="M321.92 323.27V136.6c0-10.698-5.887-16.602-16.558-16.602h-36.433c-10.672 0-16.561 5.904-16.561 16.602v88.651c0 2.497 23.996 14.089 24.623 16.541 18.282 71.61 3.972 128.92-13.359 131.6 28.337 1.405 31.455 15.064 10.348 5.731 3.229-38.209 15.828-38.134 52.049-1.406.31.317 7.427 15.282 7.87 15.282h85.545c10.672 0 16.558-5.9 16.558-16.6v-36.524c0-10.698-5.886-16.602-16.558-16.602z" fill="#02a9ff"/>
                <path d="M170.68 120 74.999 393h74.338l16.192-47.222h80.96L262.315 393h73.968l-95.314-273zm11.776 165.28 23.183-75.629 25.393 75.629z" fill="#fefefe"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {anilistUser ? "AniList Connected" : "Connect AniList"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={anilistUser ? anilistUser.name : undefined}>
                {anilistUser ? anilistUser.name : "Sync anime watch progress automatically."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:pt-2.5">
            {anilistUser ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {syncAnilist && (
                    <button onClick={syncAnilist} disabled={isSyncingAnilist} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                      {isSyncingAnilist ? "Syncing..." : "Sync"}
                    </button>
                  )}
                  <button onClick={disconnectAnilist} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={connectAnilist} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Trakt Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 max-sm:p-3.5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5 max-sm:flex-col max-sm:gap-2">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.05)] bg-transparent">
              <svg viewBox="0 0 48 48" className="h-full w-full">
                <defs>
                  <radialGradient id="trakt-card-grad" cx="48.46" cy="-.95" r="64.84" fx="48.46" fy="-.95" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9f42c6"/>
                    <stop offset=".27" stopColor="#a041c3"/>
                    <stop offset=".42" stopColor="#a43ebb"/>
                    <stop offset=".53" stopColor="#aa39ad"/>
                    <stop offset=".64" stopColor="#b4339a"/>
                    <stop offset=".73" stopColor="#c02b81"/>
                    <stop offset=".82" stopColor="#cf2061"/>
                    <stop offset=".9" stopColor="#e1143c"/>
                    <stop offset=".97" stopColor="#f50613"/>
                    <stop offset="1" stopColor="red"/>
                  </radialGradient>
                </defs>
                <circle cx="24" cy="24" r="24" fill="url(#trakt-card-grad)"/>
                <path d="m13.62 17.97 7.92 7.92 1.47-1.47-7.92-7.92-1.47 1.47Zm14.39 14.4 1.47-1.46-2.16-2.16L47.64 8.43c-.19-.75-.46-1.46-.79-2.14L24.39 28.75l3.62 3.62Zm-15.09-13.7-1.46 1.46 14.4 14.4 1.46-1.47L23 28.75 46.35 5.4c-.36-.6-.78-1.16-1.25-1.68L21.54 27.28l-8.62-8.61Zm34.95-9.09L28.7 28.75l1.47 1.46L48 12.38v-1.12c0-.57-.04-1.14-.13-1.68ZM25.16 22.27l-7.92-7.92-1.47 1.47 7.92 7.92 1.47-1.47Zm16.16 12.85c0 3.42-2.78 6.2-6.2 6.2H12.88c-3.42 0-6.2-2.78-6.2-6.2V12.88c0-3.42 2.78-6.21 6.2-6.21h20.78V4.6H12.88c-4.56 0-8.28 3.71-8.28 8.28v22.24c0 4.56 3.71 8.28 8.28 8.28h22.24c4.56 0 8.28-3.71 8.28-8.28v-3.51h-2.07v3.51Z" fill="#fff"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {traktUser ? "Trakt Connected" : "Connect Trakt"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={traktUser ? (traktUser.name || traktUser.username) : undefined}>
                {traktUser ? (traktUser.name || traktUser.username) : "Sync movies & TV shows history automatically."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:pt-2.5">
            {traktUser ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {syncTrakt && (
                    <button onClick={syncTrakt} disabled={isSyncingTrakt} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                      {isSyncingTrakt ? "Syncing..." : "Sync"}
                    </button>
                  )}
                  <button onClick={disconnectTrakt} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={connectTrakt} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Letterboxd Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 max-sm:p-3.5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5 max-sm:flex-col max-sm:gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="12" r="3.5" fill="#ff7a00" />
                <circle cx="12" cy="12" r="3.5" fill="#00e054" />
                <circle cx="17" cy="12" r="3.5" fill="#00b0ea" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {letterboxdUsername ? "Letterboxd Connected" : "Sync Letterboxd"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={letterboxdUsername || undefined}>
                {letterboxdUsername ? letterboxdUsername : "Sync Letterboxd watched diary entries via RSS feed."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:pt-2.5">
            {letterboxdUsername ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button onClick={handleLetterboxdImport} disabled={isImportingLetterboxd} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                    {isImportingLetterboxd ? "Syncing..." : "Sync"}
                  </button>
                  <button onClick={disconnectLetterboxd} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={() => setShowLetterboxdModal(true)} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Export CSV Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 max-sm:p-3.5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5 max-sm:flex-col max-sm:gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Export Library</p>
              <p className="text-[11px] text-text-muted mt-0.5">Download movie diary entries as CSV for importing.</p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:pt-2.5">
            <button onClick={exportLetterboxdCSV} className={`${BTN_SECONDARY} h-8 px-2 max-sm:px-1 text-[11px] sm:text-xs w-full font-semibold`}>Export CSV</button>
          </div>
        </div>
      </div>
    </div>
  );
};
