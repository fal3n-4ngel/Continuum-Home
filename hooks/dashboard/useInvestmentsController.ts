"use client";

import { useEffect, useCallback } from "react";
import { InvestmentCategory, InvestmentQuote } from "@/types";
import { useInvestmentsStore } from "@/lib/stores/investments-store";

const TICKER_SEARCH_CATEGORIES: InvestmentCategory[] = ["equity", "crypto", "mutual_fund", "sip"];

interface UseInvestmentsControllerProps {
  user: { uid: string; idToken?: string } | null;
  getHeaders: () => Record<string, string>;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export function useInvestmentsController({
  user,
  getHeaders,
  triggerConfirm,
}: UseInvestmentsControllerProps) {
  const {
    investments,
    setInvestments,
    setIsFetchingInvestments,
    setInvestmentsLoaded,
    invName,
    setInvName,
    invMfSchemeCode,
    setInvMfSchemeCode,
    invCategory,
    setInvCategory,
    invAmount,
    setInvAmount,
    invQuantity,
    setInvQuantity,
    invBuyPrice,
    setInvBuyPrice,
    invNotes,
    setInvNotes,
    invInterestRate,
    setInvInterestRate,
    invStartDate,
    setInvStartDate,
    invMaturityDate,
    setInvMaturityDate,
    invCompounding,
    invSipDay,
    setInvSipDay,
    setInvSuggestions,
    setIsAddingAsset,
    setIsUpdatingPrices,
  } = useInvestmentsStore();

  const fetchInvestments = useCallback(async () => {
    setIsFetchingInvestments(true);
    try {
      const res = await fetch("/api/portfolio", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.assets) ? data.assets : []);
        setInvestments(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingInvestments(false);
      setInvestmentsLoaded(true);
    }
  }, [getHeaders, setInvestments, setIsFetchingInvestments, setInvestmentsLoaded]);

  useEffect(() => {
    if (!invName.trim() || !TICKER_SEARCH_CATEGORIES.includes(invCategory)) {
      setInvSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/portfolio/search?q=${encodeURIComponent(invName)}&category=${encodeURIComponent(invCategory)}`,
          { headers: getHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setInvSuggestions(data.quotes || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [invName, invCategory, user, getHeaders, setInvSuggestions]);

  const handleInvNameChange = useCallback(
    (value: string) => {
      setInvName(value);
      setInvMfSchemeCode("");
    },
    [setInvName, setInvMfSchemeCode]
  );

  const selectSuggestion = useCallback(
    (s: InvestmentQuote) => {
      if (s.type === "MUTUALFUND_IN" && s.schemeCode) {
        setInvName(s.name || "");
        setInvMfSchemeCode(s.schemeCode);
        setInvSuggestions([]);
        return;
      }
      setInvName(s.symbol || s.name || "");
      setInvMfSchemeCode("");
      if (invCategory === "equity" || invCategory === "crypto" || invCategory === "mutual_fund") {
        if (s.type === "EQUITY") setInvCategory("equity");
        else if (s.type === "CRYPTOCURRENCY") setInvCategory("crypto");
        else if (s.type === "MUTUALFUND") setInvCategory("mutual_fund");
      }
      setInvSuggestions([]);
    },
    [invCategory, setInvCategory, setInvMfSchemeCode, setInvName, setInvSuggestions]
  );

  const addInvestment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!invName.trim() || !invAmount) return;
      if (invCategory === "fixed_deposit" && (!invInterestRate || !invStartDate || !invMaturityDate)) return;
      setIsAddingAsset(true);
      try {
        const newAsset =
          invCategory === "fixed_deposit"
            ? {
                name: invName.trim(),
                category: invCategory,
                amount: parseFloat(invAmount),
                investedAmount: parseFloat(invAmount),
                interestRate: parseFloat(invInterestRate),
                startDate: invStartDate,
                maturityDate: invMaturityDate,
                compounding: invCompounding,
                notes: invNotes.trim() || undefined,
              }
            : {
                name: invName.trim(),
                category: invCategory,
                amount: parseFloat(invAmount),
                investedAmount: parseFloat(invAmount),
                quantity: invQuantity ? parseFloat(invQuantity) : undefined,
                buyPrice: invBuyPrice ? parseFloat(invBuyPrice) : undefined,
                notes: invNotes.trim() || undefined,
                mfSchemeCode: invMfSchemeCode || undefined,
                startDate: invCategory === "sip" && invStartDate ? invStartDate : undefined,
                sipDay: invCategory === "sip" && invSipDay ? parseInt(invSipDay, 10) : undefined,
              };
        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ assets: [...investments, newAsset] }),
        });
        if (res.ok) {
          setInvName("");
          setInvMfSchemeCode("");
          setInvAmount("");
          setInvQuantity("");
          setInvBuyPrice("");
          setInvNotes("");
          setInvInterestRate("");
          setInvStartDate("");
          setInvMaturityDate("");
          setInvSipDay("");
          fetchInvestments();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAddingAsset(false);
      }
    },
    [
      invName,
      invAmount,
      invCategory,
      invInterestRate,
      invStartDate,
      invMaturityDate,
      invCompounding,
      invNotes,
      invQuantity,
      invBuyPrice,
      invMfSchemeCode,
      invSipDay,
      investments,
      getHeaders,
      fetchInvestments,
      setIsAddingAsset,
      setInvName,
      setInvMfSchemeCode,
      setInvAmount,
      setInvQuantity,
      setInvBuyPrice,
      setInvNotes,
      setInvInterestRate,
      setInvStartDate,
      setInvMaturityDate,
      setInvSipDay,
    ]
  );

  const deleteInvestment = useCallback(
    async (id: string) => {
      triggerConfirm("Delete Asset", "Are you sure you want to delete this asset from your portfolio?", async () => {
        const previousList = [...investments];
        setInvestments(investments.filter((a) => a.id !== id));
        try {
          const res = await fetch(`/api/portfolio/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
          });
          if (!res.ok) throw new Error("Failed to delete asset");
        } catch (err) {
          console.error(err);
          setInvestments(previousList);
        }
      });
    },
    [investments, getHeaders, setInvestments, triggerConfirm]
  );

  const sellInvestment = useCallback(
    async (id: string, soldPrice: number) => {
      const previousList = [...investments];
      const now = Date.now();
      const updatedList = investments.map((a) =>
        a.id === id ? { ...a, isSold: true, soldAt: now, soldPrice, amount: 0 } : a
      );
      setInvestments(updatedList);
      try {
        const res = await fetch(`/api/portfolio/${id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ isSold: true, soldAt: now, soldPrice, amount: 0 }),
        });
        if (!res.ok) throw new Error("Failed to update asset");
      } catch (err) {
        console.error(err);
        setInvestments(previousList);
      }
    },
    [investments, getHeaders, setInvestments]
  );

  const updateMarketPrices = useCallback(async () => {
    setIsUpdatingPrices(true);
    try {
      const res = await fetch("/api/portfolio/prices", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ assets: investments, forceRefresh: true }),
      });
      if (res.ok) {
        const data = await res.json();
        const pricedAssets = (data.assets || []).map((a: any) => {
          const liveValue =
            a.category !== "sip" && a.quantity && a.currentPriceInr ? a.quantity * a.currentPriceInr : a.amount;
          return { ...a, amount: liveValue };
        });

        const saveRes = await fetch("/api/portfolio", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ assets: pricedAssets }),
        });
        if (saveRes.ok) fetchInvestments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPrices(false);
    }
  }, [investments, getHeaders, fetchInvestments, setIsUpdatingPrices]);

  return {
    fetchInvestments,
    handleInvNameChange,
    selectSuggestion,
    addInvestment,
    deleteInvestment,
    sellInvestment,
    updateMarketPrices,
  };
}
