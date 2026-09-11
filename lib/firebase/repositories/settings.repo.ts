import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";
import { docsRoot, fsFetch, FirestoreDocument, toFields, fromFields, userPath } from "../client";

export interface DashboardSettings {
  timeFilter: "7" | "30" | "90" | "salary" | "all";
  salaryDay: number;
  monthlySalary?: number;
  additionalIncome?: number;
  currency?: string;
  reconciliations?: Record<string, number>;
  salaryLog?: Record<string, { date: string; amount: number }>;
  isPro?: boolean;
  aiOptOut?: boolean;
  lastSeenRelease?: string;
  emailSubscriptions?: {
    expenses: boolean;
    portfolio: boolean;
    subscriptions: boolean;
  };
  deleted?: boolean;
  deletedAt?: number;
  updatedAt: number;
}

const SETTINGS_CACHE_TTL = 3_600_000;

export function settingsCacheKey(session: Session): string {
  return `settings:${session.config.projectId}:${session.uid}`;
}

export async function getSettings(session: Session): Promise<DashboardSettings | null> {
  const cacheKey = settingsCacheKey(session);
  const cached = await cacheGet<DashboardSettings | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    let res: FirestoreDocument;
    try {
      res = await fsFetch<FirestoreDocument>(session, userPath(session, "settings", "preferences"));
    } catch (prefErr) {
      if (prefErr instanceof ApiError && prefErr.status === 404) {
        res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/settings/${session.uid}`);
      } else {
        throw prefErr;
      }
    }
    const data = fromFields(res.fields || {});
    const reconciliationsRaw = data.reconciliations && typeof data.reconciliations === "object" ? data.reconciliations : {};
    const reconciliations: Record<string, number> = {};
    Object.entries(reconciliationsRaw as Record<string, unknown>).forEach(([k, v]) => {
      reconciliations[k] = Number(v || 0);
    });

    const salaryLogRaw = data.salaryLog && typeof data.salaryLog === "object" ? data.salaryLog : {};
    const salaryLog: Record<string, { date: string; amount: number }> = {};
    Object.entries(salaryLogRaw as Record<string, unknown>).forEach(([k, v]) => {
      const entry = v as Record<string, unknown>;
      if (entry && typeof entry === "object") {
        salaryLog[k] = { date: String(entry.date || k), amount: Number(entry.amount || 0) };
      }
    });

    const emailSubsRaw = data.emailSubscriptions && typeof data.emailSubscriptions === "object" ? (data.emailSubscriptions as Record<string, unknown>) : {};

    const record: DashboardSettings = {
      timeFilter: (data.timeFilter as DashboardSettings["timeFilter"]) || "all",
      salaryDay: Number(data.salaryDay || 1),
      monthlySalary: Number(data.monthlySalary || 0),
      additionalIncome: Number(data.additionalIncome || 0),
      currency: typeof data.currency === "string" && data.currency ? data.currency : "₹",
      reconciliations,
      salaryLog,
      isPro: data.isPro === true,
      aiOptOut: data.aiOptOut === true,
      lastSeenRelease: typeof data.lastSeenRelease === "string" && data.lastSeenRelease ? data.lastSeenRelease : undefined,
      emailSubscriptions: {
        expenses: emailSubsRaw.expenses !== false,
        portfolio: emailSubsRaw.portfolio === true,
        subscriptions: emailSubsRaw.subscriptions !== false,
      },
      updatedAt: Number(data.updatedAt || 0),
    };
    await cacheSet(cacheKey, record, SETTINGS_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, SETTINGS_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updateSettings(session: Session, updates: Partial<Omit<DashboardSettings, "updatedAt">>) {
  const docData = { ...updates, updatedAt: Date.now() };
  const params = new URLSearchParams();
  Object.keys(docData).forEach((k) => params.append("updateMask.fieldPaths", k));

  try {
    await fsFetch(session, `${userPath(session, "settings", "preferences")}?${params}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: toFields(docData) }),
    });
  } catch {}

  try {
    await fsFetch(session, `${docsRoot(session)}/settings/${session.uid}?${params}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: toFields(docData) }),
    });
  } catch {}

  await cacheInvalidate(settingsCacheKey(session));
}
