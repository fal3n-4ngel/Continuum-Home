"use client";

import { useState, useCallback } from "react";
import { safeLocalStorage } from "@/lib/utils/storage";
import { getCurrencySymbol, snapshotPreviousCyclesSalary, buildCycleHistory } from "@/lib/utils";
import { useExpensesStore } from "@/lib/stores/expenses-store";

interface UseDashboardSettingsProps {
  user: { uid: string; idToken?: string } | null;
  getHeaders: () => Record<string, string>;
  setIsProUser: (isPro: boolean) => void;
  setFirestoreLastSeenRelease: (ver: string | null) => void;
  loadAnilistUser: (token: string) => void;
  setAnilistUser: (u: any) => void;
  loadTraktUser: (accessToken: string, refreshToken: string, idToken: string | undefined) => void;
  setTraktUser: (u: any) => void;
  setLetterboxdUsername: (s: string) => void;
  setGoodreadsUserId: (s: string) => void;
}

export function useDashboardSettings({
  user,
  getHeaders,
  setIsProUser,
  setFirestoreLastSeenRelease,
  loadAnilistUser,
  setAnilistUser,
  loadTraktUser,
  setTraktUser,
  setLetterboxdUsername,
  setGoodreadsUserId,
}: UseDashboardSettingsProps) {
  const [currency, setCurrencyState] = useState<string>(() => {
    const saved = safeLocalStorage.getItem("phub_currency");
    return getCurrencySymbol(saved);
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [timeFilter, setTimeFilterState] = useState<"7" | "30" | "90" | "salary" | "prev_salary" | "all">(
    () => (safeLocalStorage.getItem("phub_time_filter") as "7" | "30" | "90" | "salary" | "prev_salary" | "all") || "all"
  );
  const [salaryDay, setSalaryDayState] = useState<number>(() => {
    const saved = parseInt(safeLocalStorage.getItem("phub_salary_day") || "", 10);
    return Number.isFinite(saved) && saved >= 1 && saved <= 28 ? saved : 1;
  });
  const [monthlySalary, setMonthlySalaryState] = useState<number>(() => {
    const saved = safeLocalStorage.getItem("phub_monthly_salary");
    return saved ? parseFloat(saved) : 0;
  });
  const [additionalIncome, setAdditionalIncomeState] = useState<number>(() => {
    const saved = safeLocalStorage.getItem("phub_additional_income");
    return saved ? parseFloat(saved) : 0;
  });
  const [reconciliations, setReconciliationsState] = useState<Record<string, number>>({});
  const [salaryLog, setSalaryLogState] = useState<Record<string, { date: string; amount: number }>>(() => {
    try {
      const saved = safeLocalStorage.getItem("phub_salary_log");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [emailSubscriptions, setEmailSubscriptionsState] = useState<{
    expenses: boolean;
    portfolio: boolean;
    subscriptions: boolean;
  }>({
    expenses: true,
    portfolio: false,
    subscriptions: true,
  });
  const [aiOptOut, setAiOptOutState] = useState<boolean>(() => {
    return safeLocalStorage.getItem("phub_ai_opt_out") === "true";
  });

  const patchSettings = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!user) return;
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify(patch),
        });
      } catch {}
    },
    [user, getHeaders]
  );

  const applySettingsData = useCallback(
    (data: any) => {
      if (!data) return;
      if (data.timeFilter) {
        setTimeFilterState(data.timeFilter);
        safeLocalStorage.setItem("phub_time_filter", data.timeFilter);
        useExpensesStore.getState().setTimeFilter(data.timeFilter);
      }
      if (data.salaryDay) {
        setSalaryDayState(data.salaryDay);
        useExpensesStore.getState().setSalaryDay(data.salaryDay);
      }
      if (data.monthlySalary !== undefined) {
        setMonthlySalaryState(data.monthlySalary);
        safeLocalStorage.setItem("phub_monthly_salary", String(data.monthlySalary));
      }
      if (data.additionalIncome !== undefined) {
        setAdditionalIncomeState(data.additionalIncome);
        safeLocalStorage.setItem("phub_additional_income", String(data.additionalIncome));
      }
      if (data.currency) {
        const sym = getCurrencySymbol(data.currency);
        setCurrencyState(sym);
        safeLocalStorage.setItem("phub_currency", sym);
      }
      if (data.reconciliations && typeof data.reconciliations === "object") {
        setReconciliationsState(data.reconciliations);
      }
      if (data.salaryLog && typeof data.salaryLog === "object") {
        setSalaryLogState(data.salaryLog);
        useExpensesStore.getState().setSalaryLog(data.salaryLog);
      }
      if (data.emailSubscriptions && typeof data.emailSubscriptions === "object") {
        setEmailSubscriptionsState({
          expenses: data.emailSubscriptions.expenses !== false,
          portfolio: data.emailSubscriptions.portfolio === true,
          subscriptions: data.emailSubscriptions.subscriptions !== false,
        });
      }
      if (data.aiOptOut !== undefined) {
        setAiOptOutState(data.aiOptOut === true);
        safeLocalStorage.setItem("phub_ai_opt_out", String(data.aiOptOut === true));
      }
      if (data.lastSeenRelease) {
        setFirestoreLastSeenRelease(data.lastSeenRelease);
      }
      setIsProUser(data.isPro === true);

      if (data.integrations) {
        const { anilist, trakt, letterboxd, goodreads } = data.integrations;
        if (anilist?.token) {
          safeLocalStorage.setItem("anilist_token", anilist.token);
          loadAnilistUser(anilist.token);
        } else if (anilist === null) {
          safeLocalStorage.removeItem("anilist_token");
          setAnilistUser(null);
        }

        if (trakt?.accessToken && trakt?.refreshToken) {
          safeLocalStorage.setItem("trakt_access_token", trakt.accessToken);
          safeLocalStorage.setItem("trakt_refresh_token", trakt.refreshToken);
          loadTraktUser(trakt.accessToken, trakt.refreshToken, user?.idToken);
        } else if (trakt === null) {
          safeLocalStorage.removeItem("trakt_access_token");
          safeLocalStorage.removeItem("trakt_refresh_token");
          setTraktUser(null);
        }

        if (letterboxd?.username) {
          safeLocalStorage.setItem("letterboxd_username", letterboxd.username);
          setLetterboxdUsername(letterboxd.username);
        } else if (letterboxd === null) {
          safeLocalStorage.removeItem("letterboxd_username");
          setLetterboxdUsername("");
        }

        if (goodreads?.userId) {
          safeLocalStorage.setItem("goodreads_user_id", goodreads.userId);
          setGoodreadsUserId(goodreads.userId);
        } else if (goodreads === null) {
          safeLocalStorage.removeItem("goodreads_user_id");
          setGoodreadsUserId("");
        }
      }

      const localAni = safeLocalStorage.getItem("anilist_token");
      const localTrAcc = safeLocalStorage.getItem("trakt_access_token");
      const localTrRef = safeLocalStorage.getItem("trakt_refresh_token");
      const localLb = safeLocalStorage.getItem("letterboxd_username");
      const localGr = safeLocalStorage.getItem("goodreads_user_id");

      const toSync: Record<string, unknown> = {};
      if (localAni && !data.integrations?.anilist?.token) toSync.anilist = { token: localAni };
      if (localTrAcc && localTrRef && (!data.integrations?.trakt?.accessToken || !data.integrations?.trakt?.refreshToken)) {
        toSync.trakt = { accessToken: localTrAcc, refreshToken: localTrRef };
      }
      if (localLb && !data.integrations?.letterboxd?.username) toSync.letterboxd = { username: localLb };
      if (localGr && !data.integrations?.goodreads?.userId) toSync.goodreads = { userId: localGr };
      if (Object.keys(toSync).length > 0) {
        patchSettings({ integrations: toSync });
      }
      setSettingsLoaded(true);
      useExpensesStore.getState().setSettingsLoaded(true);
    },
    [
      user,
      setIsProUser,
      setFirestoreLastSeenRelease,
      loadAnilistUser,
      setAnilistUser,
      loadTraktUser,
      setTraktUser,
      setLetterboxdUsername,
      setGoodreadsUserId,
      patchSettings,
    ]
  );

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { headers: getHeaders() });
      if (res.ok) {
        applySettingsData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoaded(true);
      useExpensesStore.getState().setSettingsLoaded(true);
    }
  }, [getHeaders, applySettingsData]);

  const setTimeFilter = (f: "7" | "30" | "90" | "salary" | "prev_salary" | "all") => {
    setTimeFilterState(f);
    safeLocalStorage.setItem("phub_time_filter", f);
    useExpensesStore.getState().setTimeFilter(f);
    patchSettings({ timeFilter: f });
  };

  const setSalaryDay = (d: number) => {
    if (d === salaryDay) return;
    setSalaryDayState(d);
    useExpensesStore.getState().setSalaryDay(d);
    patchSettings({ salaryDay: d });
  };

  const setMonthlySalary = (val: number, options?: { overwriteHistory?: boolean }) => {
    const overwriteHistory = Boolean(options?.overwriteHistory);
    if (val === monthlySalary && !overwriteHistory) return;

    const expenses = useExpensesStore.getState().expenses;
    let nextSalaryLog: Record<string, { date: string; amount: number }> | null = null;

    if (overwriteHistory) {
      const pastCycles = buildCycleHistory(salaryDay, salaryLog, 12).slice(1);
      const updatedLog = { ...salaryLog };
      let changed = false;
      for (const cycle of pastCycles) {
        if (updatedLog[cycle.startStr]) {
          updatedLog[cycle.startStr] = { date: cycle.startStr, amount: val };
          changed = true;
        }
      }
      if (changed) nextSalaryLog = updatedLog;
    } else {
      nextSalaryLog = snapshotPreviousCyclesSalary({
        salaryDay,
        previousSalary: monthlySalary,
        newSalary: val,
        salaryLog,
        expenses,
      });
    }

    setMonthlySalaryState(val);
    safeLocalStorage.setItem("phub_monthly_salary", String(val));
    if (nextSalaryLog) {
      setSalaryLogState(nextSalaryLog);
      useExpensesStore.getState().setSalaryLog(nextSalaryLog);
      patchSettings({ monthlySalary: val, salaryLog: nextSalaryLog });
      return;
    }
    patchSettings({ monthlySalary: val });
  };

  const setAdditionalIncome = (val: number) => {
    if (val === additionalIncome) return;
    setAdditionalIncomeState(val);
    safeLocalStorage.setItem("phub_additional_income", String(val));
    patchSettings({ additionalIncome: val });
  };

  const setAiOptOut = (val: boolean) => {
    if (val === aiOptOut) return;
    setAiOptOutState(val);
    safeLocalStorage.setItem("phub_ai_opt_out", String(val));
    patchSettings({ aiOptOut: val });
  };

  const setReconciliation = (cycleStartDate: string, actualAmount: number | null) => {
    const next = { ...reconciliations };
    if (actualAmount === null) {
      delete next[cycleStartDate];
    } else {
      next[cycleStartDate] = actualAmount;
    }
    setReconciliationsState(next);
    patchSettings({ reconciliations: next });
  };

  const setSalaryLogEntry = (date: string, amount: number) => {
    const next = { ...salaryLog, [date]: { date, amount } };
    setSalaryLogState(next);
    useExpensesStore.getState().setSalaryLog(next);
    patchSettings({ salaryLog: next });
  };

  const setCurrency = (c: string) => {
    const symbol = getCurrencySymbol(c);
    setCurrencyState(symbol);
    safeLocalStorage.setItem("phub_currency", symbol);
    patchSettings({ currency: symbol });
  };

  const setEmailSubscriptions = (next: { expenses: boolean; portfolio: boolean; subscriptions: boolean }) => {
    setEmailSubscriptionsState(next);
    patchSettings({ emailSubscriptions: next });
  };

  return {
    currency,
    setCurrency,
    settingsLoaded,
    timeFilter,
    setTimeFilter,
    salaryDay,
    setSalaryDay,
    monthlySalary,
    setMonthlySalary,
    additionalIncome,
    setAdditionalIncome,
    reconciliations,
    setReconciliation,
    salaryLog,
    setSalaryLogEntry,
    emailSubscriptions,
    setEmailSubscriptions,
    aiOptOut,
    setAiOptOut,
    patchSettings,
    fetchSettings,
    applySettingsData,
  };
}
