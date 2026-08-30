"use client";

import { useState, useMemo, useCallback } from "react";
import type { PortfolioRecord, InvestmentAsset } from "@/lib/firebase";

export function usePortfolio(initialData?: PortfolioRecord | null) {
  const [portfolio, setPortfolio] = useState<PortfolioRecord | null>(initialData || null);

  const activeAssets = useMemo(() => {
    return (portfolio?.assets || []).filter((a: InvestmentAsset) => !a.isSold);
  }, [portfolio]);

  const soldAssets = useMemo(() => {
    return (portfolio?.assets || []).filter((a: InvestmentAsset) => a.isSold);
  }, [portfolio]);

  const totalCurrentValue = useMemo(() => {
    return activeAssets.reduce((sum: number, asset: InvestmentAsset) => sum + (asset.amount || 0), 0);
  }, [activeAssets]);

  const totalInvestedAmount = useMemo(() => {
    return activeAssets.reduce((sum: number, asset: InvestmentAsset) => sum + (asset.investedAmount || asset.amount || 0), 0);
  }, [activeAssets]);

  const netPnl = useMemo(() => {
    return totalCurrentValue - totalInvestedAmount;
  }, [totalCurrentValue, totalInvestedAmount]);

  const updateAssetLocally = useCallback((id: string, updates: Partial<InvestmentAsset>) => {
    setPortfolio((prev: PortfolioRecord | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        assets: prev.assets.map((a: InvestmentAsset) => (a.id === id ? { ...a, ...updates } : a)),
      };
    });
  }, []);

  return {
    portfolio,
    setPortfolio,
    activeAssets,
    soldAssets,
    totalCurrentValue,
    totalInvestedAmount,
    netPnl,
    updateAssetLocally,
  };
}
