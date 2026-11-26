"use client";

import { useState, useCallback } from "react";
import { Subscription } from "@/types";
import { getNextFutureBillingDate } from "@/lib/utils";

interface UseSubscriptionsControllerProps {
  getHeaders: () => Record<string, string>;
  triggerConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onAutoPosted?: () => void;
}

export function useSubscriptionsController({
  getHeaders,
  triggerConfirm,
  onAutoPosted,
}: UseSubscriptionsControllerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoaded, setSubscriptionsLoaded] = useState(false);
  const [isFetchingSubscriptions, setIsFetchingSubscriptions] = useState(false);
  const [subName, setSubName] = useState("");
  const [subIcon, setSubIcon] = useState("");
  const [subCost, setSubCost] = useState("");
  const [subCycle, setSubCycle] = useState<"monthly" | "yearly">("monthly");
  const [subNextDate, setSubNextDate] = useState("");
  const [subType, setSubType] = useState<"expense" | "income">("expense");
  const [subAutoPost, setSubAutoPost] = useState(false);
  const [subCategory, setSubCategory] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [isSyncingSubscriptions, setIsSyncingSubscriptions] = useState(false);

  const hydrateSubscriptions = useCallback(
    (loaded: Subscription[]) => {
      const rolled = loaded.map((sub) => {
        if (sub.autoPost) return sub;
        const futureDate = getNextFutureBillingDate(sub.nextBillingDate, sub.billingCycle);
        if (futureDate !== sub.nextBillingDate) {
          fetch(`/api/subscriptions/${sub.id}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({ nextBillingDate: futureDate }),
          }).catch((e) => console.error(e));
          return { ...sub, nextBillingDate: futureDate };
        }
        return sub;
      });
      setSubscriptions(rolled);
      setSubscriptionsLoaded(true);
    },
    [getHeaders, setSubscriptions, setSubscriptionsLoaded]
  );

  const fetchSubscriptions = useCallback(async () => {
    setIsFetchingSubscriptions(true);
    try {
      const res = await fetch("/api/subscriptions", { headers: getHeaders() });
      if (res.ok) {
        hydrateSubscriptions((await res.json()) as Subscription[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingSubscriptions(false);
      setSubscriptionsLoaded(true);
    }
  }, [getHeaders, hydrateSubscriptions, setIsFetchingSubscriptions, setSubscriptionsLoaded]);

  const addSubscription = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subName.trim() || !subCost || !subNextDate) return;
      setIsAddingSub(true);
      try {
        const res = await fetch("/api/subscriptions", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            name: subName.trim(),
            cost: parseFloat(subCost),
            billingCycle: subCycle,
            nextBillingDate: subNextDate,
            icon: subIcon.trim() || null,
            type: subType,
            autoPost: subAutoPost,
            category: subCategory.trim() || null,
          }),
        });
        if (res.ok) {
          setSubName("");
          setSubCost("");
          setSubIcon("");
          setSubCategory("");
          setSubAutoPost(false);
          setSubType("expense");
          fetchSubscriptions();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAddingSub(false);
      }
    },
    [subName, subCost, subNextDate, subCycle, subIcon, subType, subAutoPost, subCategory, getHeaders, fetchSubscriptions]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      triggerConfirm("Delete Subscription", "Are you sure you want to delete this subscription?", async () => {
        const previousList = [...subscriptions];
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        try {
          const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() });
          if (!res.ok) throw new Error("Failed to delete subscription");
        } catch (err) {
          console.error(err);
          setSubscriptions(previousList);
        }
      });
    },
    [subscriptions, getHeaders, triggerConfirm]
  );

  const updateSubscription = useCallback(
    async (id: string, patch: Partial<Subscription>) => {
      const previousList = [...subscriptions];
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      try {
        const res = await fetch(`/api/subscriptions/${id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Failed to update subscription");
      } catch (err) {
        console.error(err);
        setSubscriptions(previousList);
      }
    },
    [subscriptions, getHeaders]
  );

  const updateSubscriptionIcon = useCallback(
    async (id: string, icon: string) => {
      const nextIcon = icon.trim() || null;
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, icon: nextIcon } : s)));
      try {
        await fetch(`/api/subscriptions/${id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ icon: nextIcon }),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [getHeaders]
  );

  const toggleSubscriptionAutoPost = useCallback(
    async (id: string, nextValue: boolean) => {
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, autoPost: nextValue } : s)));
      try {
        await fetch(`/api/subscriptions/${id}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({ autoPost: nextValue }),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [getHeaders]
  );

  const syncDueSubscriptions = useCallback(async () => {
    setIsSyncingSubscriptions(true);
    try {
      const res = await fetch("/api/subscriptions/auto-post", {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchSubscriptions();
        onAutoPosted?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncingSubscriptions(false);
    }
  }, [getHeaders, fetchSubscriptions, onAutoPosted]);

  return {
    subscriptions,
    setSubscriptions,
    subscriptionsLoaded,
    isFetchingSubscriptions,
    subName,
    setSubName,
    subIcon,
    setSubIcon,
    subCost,
    setSubCost,
    subCycle,
    setSubCycle,
    subNextDate,
    setSubNextDate,
    subType,
    setSubType,
    subAutoPost,
    setSubAutoPost,
    subCategory,
    setSubCategory,
    isAddingSub,
    isSyncingSubscriptions,
    fetchSubscriptions,
    hydrateSubscriptions,
    addSubscription,
    deleteSubscription,
    updateSubscription,
    updateSubscriptionIcon,
    toggleSubscriptionAutoPost,
    syncDueSubscriptions,
  };
}
