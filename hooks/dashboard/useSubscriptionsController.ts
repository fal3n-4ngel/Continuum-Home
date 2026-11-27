"use client";

import { useState, useCallback, useRef } from "react";
import { FamilyMember, SharedSubscription, Subscription } from "@/types";
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
  const [sharedSubscriptions, setSharedSubscriptions] = useState<SharedSubscription[]>([]);
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
  const [subIsFamilyPlan, setSubIsFamilyPlan] = useState(false);
  const [subSendMemberEmails, setSubSendMemberEmails] = useState(true);
  const [subFamilyMembers, setSubFamilyMembers] = useState<FamilyMember[]>([]);
  const [continuumMemberEmails, setContinuumMemberEmails] = useState<Record<string, boolean>>({});
  const checkedMemberEmailsRef = useRef<Set<string>>(new Set());
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [isSyncingSubscriptions, setIsSyncingSubscriptions] = useState(false);

  const checkFamilyMembers = useCallback(
    async (emails: string[]) => {
      const normalized = Array.from(
        new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))
      ).filter((e) => !checkedMemberEmailsRef.current.has(e));
      if (normalized.length === 0) return;
      normalized.forEach((e) => checkedMemberEmailsRef.current.add(e));
      try {
        const res = await fetch("/api/subscriptions/check-members", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ emails: normalized }),
        });
        if (!res.ok) {
          normalized.forEach((e) => checkedMemberEmailsRef.current.delete(e));
          return;
        }
        const data = (await res.json()) as { registeredEmails?: string[] };
        const registered = new Set((data.registeredEmails || []).map((e) => e.toLowerCase()));
        setContinuumMemberEmails((prev) => {
          const next = { ...prev };
          for (const email of normalized) {
            next[email] = registered.has(email);
          }
          return next;
        });
      } catch (err) {
        normalized.forEach((e) => checkedMemberEmailsRef.current.delete(e));
        console.error(err);
      }
    },
    [getHeaders]
  );

  const fetchSharedSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions/shared", { headers: getHeaders() });
      if (res.ok) {
        setSharedSubscriptions((await res.json()) as SharedSubscription[]);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getHeaders]);

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
      const memberEmails = rolled.flatMap((s) => (s.familyMembers || []).map((m) => m.email));
      if (memberEmails.length > 0) {
        checkFamilyMembers(memberEmails);
      }
      fetchSharedSubscriptions();
    },
    [getHeaders, setSubscriptions, setSubscriptionsLoaded, checkFamilyMembers, fetchSharedSubscriptions]
  );

  const syncSharedSubscription = useCallback(
    async (subscriptionId: string) => {
      try {
        await fetch("/api/subscriptions/shared", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ subscriptionId }),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [getHeaders]
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
            isFamilyPlan: subIsFamilyPlan,
            sendMemberEmails: subIsFamilyPlan ? subSendMemberEmails : true,
            familyMembers: subIsFamilyPlan ? subFamilyMembers : [],
          }),
        });
        if (res.ok) {
          const created = (await res.json().catch(() => ({}))) as { id?: string };
          const shouldSyncShared = subIsFamilyPlan && subFamilyMembers.length > 0;
          setSubName("");
          setSubCost("");
          setSubIcon("");
          setSubCategory("");
          setSubAutoPost(false);
          setSubType("expense");
          setSubIsFamilyPlan(false);
          setSubSendMemberEmails(true);
          setSubFamilyMembers([]);
          if (shouldSyncShared && created.id) {
            await syncSharedSubscription(created.id);
          }
          fetchSubscriptions();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAddingSub(false);
      }
    },
    [subName, subCost, subNextDate, subCycle, subIcon, subType, subAutoPost, subCategory, subIsFamilyPlan, subSendMemberEmails, subFamilyMembers, getHeaders, fetchSubscriptions, syncSharedSubscription]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      triggerConfirm("Delete Subscription", "Are you sure you want to delete this subscription?", async () => {
        const previousList = [...subscriptions];
        const target = subscriptions.find((s) => s.id === id);
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
        try {
          const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE", headers: getHeaders() });
          if (!res.ok) throw new Error("Failed to delete subscription");
          if (target?.isFamilyPlan) {
            await syncSharedSubscription(id);
          }
        } catch (err) {
          console.error(err);
          setSubscriptions(previousList);
        }
      });
    },
    [subscriptions, getHeaders, triggerConfirm, syncSharedSubscription]
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
        if (
          patch.isFamilyPlan !== undefined ||
          patch.familyMembers !== undefined ||
          patch.cost !== undefined ||
          patch.name !== undefined ||
          patch.nextBillingDate !== undefined ||
          patch.billingCycle !== undefined
        ) {
          await syncSharedSubscription(id);
        }
      } catch (err) {
        console.error(err);
        setSubscriptions(previousList);
      }
    },
    [subscriptions, getHeaders, syncSharedSubscription]
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

  const toggleFamilyMemberPaid = useCallback(
    async (subscriptionId: string, memberEmail: string, paid: boolean) => {
      const normalized = memberEmail.trim().toLowerCase();
      const targetSub = subscriptions.find((s) => s.id === subscriptionId);
      const nextPaidCycle = paid ? (targetSub?.nextBillingDate || "") : null;
      const previous = [...subscriptions];

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id !== subscriptionId
            ? s
            : {
                ...s,
                familyMembers: (s.familyMembers || []).map((m) =>
                  m.email.trim().toLowerCase() === normalized
                    ? { ...m, paidForCycle: nextPaidCycle }
                    : m
                ),
              }
        )
      );

      try {
        const res = await fetch("/api/subscriptions/shared/pay", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            mode: "owner",
            subscriptionId,
            memberEmail: normalized,
            paid,
          }),
        });
        if (!res.ok) throw new Error("Failed to update member paid status");
      } catch (err) {
        console.error(err);
        setSubscriptions(previous);
      }
    },
    [subscriptions, getHeaders]
  );

  const toggleSharedSubscriptionPaid = useCallback(
    async (shared: SharedSubscription, paid: boolean): Promise<boolean> => {
      const nextPaidCycle = paid ? shared.nextBillingDate : null;
      const previous = [...sharedSubscriptions];
      setSharedSubscriptions((prev) =>
        prev.map((s) => (s.id === shared.id ? { ...s, paidForCycle: nextPaidCycle } : s))
      );
      try {
        const res = await fetch("/api/subscriptions/shared/pay", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            mode: "member",
            ownerUid: shared.ownerUid,
            subscriptionId: shared.subscriptionId,
            paid,
          }),
        });
        if (!res.ok) throw new Error("Failed to update shared paid status");
        return true;
      } catch (err) {
        console.error(err);
        setSharedSubscriptions(previous);
        return false;
      }
    },
    [sharedSubscriptions, getHeaders]
  );

  const logSharedSubscriptionPayment = useCallback(
    async (shared: SharedSubscription): Promise<boolean> => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            title: `${shared.name} (Family Share)`,
            amount: Number(shared.memberShare.toFixed(2)),
            category: shared.category || "Subscriptions",
            date: todayStr,
            notes: `Family plan share paid to ${shared.ownerEmail}`,
            type: "expense",
          }),
        });
        if (res.ok) {
          await toggleSharedSubscriptionPaid(shared, true);
          onAutoPosted?.();
          return true;
        }
        return false;
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    [getHeaders, onAutoPosted, toggleSharedSubscriptionPaid]
  );

  const dismissSharedSubscription = useCallback(
    async (id: string) => {
      const previous = [...sharedSubscriptions];
      setSharedSubscriptions((prev) => prev.filter((s) => s.id !== id));
      try {
        const res = await fetch(`/api/subscriptions/shared?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error("Failed to dismiss shared subscription");
      } catch (err) {
        console.error(err);
        setSharedSubscriptions(previous);
      }
    },
    [sharedSubscriptions, getHeaders]
  );

  return {
    subscriptions,
    sharedSubscriptions,
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
    subIsFamilyPlan,
    setSubIsFamilyPlan,
    subSendMemberEmails,
    setSubSendMemberEmails,
    subFamilyMembers,
    setSubFamilyMembers,
    continuumMemberEmails,
    checkFamilyMembers,
    toggleFamilyMemberPaid,
    toggleSharedSubscriptionPaid,
    logSharedSubscriptionPayment,
    dismissSharedSubscription,
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
