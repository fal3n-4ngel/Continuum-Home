"use client";

import { useState, useEffect } from "react";

export interface FeatureFlags {
  enableInvestmentPortfolios: boolean;
  enableChatAssistant: boolean;
  enableGeminiChatAssitant: boolean;
  enableGPTMigration: boolean;
  enabeGPTMigration: boolean;
  loading: boolean;
}

let cachedFlags: Omit<FeatureFlags, "loading"> | null = null;
let fetchPromise: Promise<Omit<FeatureFlags, "loading">> | null = null;

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<Omit<FeatureFlags, "loading">>(
    cachedFlags || {
      enableInvestmentPortfolios: true,
      enableChatAssistant: false,
      enableGeminiChatAssitant: false,
      enableGPTMigration: false,
      enabeGPTMigration: false,
    }
  );
  const [loading, setLoading] = useState(!cachedFlags);

  useEffect(() => {
    if (cachedFlags) {
      setFlags(cachedFlags);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch("/api/flags")
        .then((res) => (res.ok ? (res.json() as Promise<Record<string, unknown>>) : {}))
        .then((data: Record<string, unknown>) => {
          const resolved = {
            enableInvestmentPortfolios: true,
            enableChatAssistant: Boolean(data.enableChatAssistant ?? data.enableGeminiChatAssitant),
            enableGeminiChatAssitant: Boolean(data.enableGeminiChatAssitant ?? data.enableChatAssistant),
            enableGPTMigration: Boolean(data.enableGPTMigration ?? data.enabeGPTMigration),
            enabeGPTMigration: Boolean(data.enabeGPTMigration ?? data.enableGPTMigration),
          };
          cachedFlags = resolved;
          return resolved;
        })
        .catch((err) => {
          console.error("Failed to load feature flags:", err);
          const fallback = {
            enableInvestmentPortfolios: true,
            enableChatAssistant: false,
            enableGeminiChatAssitant: false,
            enableGPTMigration: false,
            enabeGPTMigration: false,
          };
          cachedFlags = fallback;
          return fallback;
        });
    }

    fetchPromise.then((resolved) => {
      setFlags(resolved);
      setLoading(false);
    });
  }, []);

  return { ...flags, loading };
}
