"use client";

import { useState, useEffect, useCallback } from "react";

export type MainTab =
  | "expenses"
  | "subscriptions"
  | "investments"
  | "financial"
  | "reports"
  | "media"
  | "agent"
  | "admin"
  | "settings";

export type MediaSubTab = "watchlist" | "books" | "integrations";

export function useDashboardRouter() {
  const [activeTab, setActiveTabState] = useState<MainTab>("expenses");
  const [mediaSubTab, setMediaSubTabState] = useState<MediaSubTab>("watchlist");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      localStorage.setItem("phub_embedded_token", tokenParam);
    }

    const queryTab = searchParams.get("tab");
    const hashTab = window.location.hash.replace("#", "");
    const tab = queryTab || hashTab;

    if (tab) {
      if (
        ["expenses", "subscriptions", "investments", "financial", "reports", "agent", "admin", "settings"].includes(tab)
      ) {
        setActiveTabState(tab as MainTab);
      } else if (["watchlist", "books", "integrations"].includes(tab)) {
        setActiveTabState("media");
        setMediaSubTabState(tab as MediaSubTab);
      } else if (tab === "health") {
        setActiveTabState("financial");
      }
    }
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab as MainTab);
  }, []);

  const setMediaSubTab = useCallback((subTab: MediaSubTab) => {
    setMediaSubTabState(subTab);
  }, []);

  return {
    activeTab,
    mediaSubTab,
    setActiveTab,
    setMediaSubTab,
  };
}
