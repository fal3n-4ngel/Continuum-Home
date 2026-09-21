import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate, encrypt, decrypt } from "@/lib/utils";
import { fsFetch, FirestoreDocument, toFields, fromFields, userPath } from "../client";

export interface UserIntegrations {
  anilist?: {
    token?: string;
  } | null;
  trakt?: {
    accessToken?: string;
    refreshToken?: string;
  } | null;
  letterboxd?: {
    username?: string;
  } | null;
  goodreads?: {
    userId?: string;
  } | null;
}

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
  integrations?: UserIntegrations;
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
    const res = await fsFetch<FirestoreDocument>(session, userPath(session, "settings", "preferences"));
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

    let integrations: UserIntegrations | undefined = undefined;
    if (data.integrations && typeof data.integrations === "object") {
      const raw = data.integrations as Record<string, unknown>;
      const parsed: UserIntegrations = {};
      if (raw.anilist && typeof raw.anilist === "object") {
        const a = raw.anilist as Record<string, unknown>;
        parsed.anilist = {
          token: a.token ? decrypt(String(a.token)) : undefined,
        };
      }
      if (raw.trakt && typeof raw.trakt === "object") {
        const t = raw.trakt as Record<string, unknown>;
        parsed.trakt = {
          accessToken: t.accessToken ? decrypt(String(t.accessToken)) : undefined,
          refreshToken: t.refreshToken ? decrypt(String(t.refreshToken)) : undefined,
        };
      }
      if (raw.letterboxd && typeof raw.letterboxd === "object") {
        const l = raw.letterboxd as Record<string, unknown>;
        parsed.letterboxd = {
          username: l.username ? String(l.username) : undefined,
        };
      }
      if (raw.goodreads && typeof raw.goodreads === "object") {
        const g = raw.goodreads as Record<string, unknown>;
        parsed.goodreads = {
          userId: g.userId ? String(g.userId) : undefined,
        };
      }
      integrations = parsed;
    }

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
      integrations,
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
  const toUpdate: Record<string, unknown> = { ...updates };

  if (updates.integrations !== undefined) {
    const current = await getSettings(session);
    const existing = current?.integrations || {};
    const merged: Record<string, unknown> = {};

    // Preserve existing non-empty integrations encrypted
    if (existing.anilist?.token) {
      merged.anilist = { token: encrypt(existing.anilist.token) };
    }
    if (existing.trakt?.accessToken && existing.trakt?.refreshToken) {
      merged.trakt = {
        accessToken: encrypt(existing.trakt.accessToken),
        refreshToken: encrypt(existing.trakt.refreshToken),
      };
    }
    if (existing.letterboxd?.username) {
      merged.letterboxd = { username: existing.letterboxd.username };
    }
    if (existing.goodreads?.userId) {
      merged.goodreads = { userId: existing.goodreads.userId };
    }

    // Apply updates
    if (updates.integrations.anilist !== undefined) {
      if (updates.integrations.anilist === null) {
        delete merged.anilist;
      } else if (updates.integrations.anilist.token) {
        merged.anilist = { token: encrypt(updates.integrations.anilist.token) };
      }
    }

    if (updates.integrations.trakt !== undefined) {
      if (updates.integrations.trakt === null) {
        delete merged.trakt;
      } else if (updates.integrations.trakt.accessToken && updates.integrations.trakt.refreshToken) {
        merged.trakt = {
          accessToken: encrypt(updates.integrations.trakt.accessToken),
          refreshToken: encrypt(updates.integrations.trakt.refreshToken),
        };
      }
    }

    if (updates.integrations.letterboxd !== undefined) {
      if (updates.integrations.letterboxd === null) {
        delete merged.letterboxd;
      } else if (updates.integrations.letterboxd.username) {
        merged.letterboxd = { username: updates.integrations.letterboxd.username };
      }
    }

    if (updates.integrations.goodreads !== undefined) {
      if (updates.integrations.goodreads === null) {
        delete merged.goodreads;
      } else if (updates.integrations.goodreads.userId) {
        merged.goodreads = { userId: updates.integrations.goodreads.userId };
      }
    }

    toUpdate.integrations = merged;
  }

  const docData = { ...toUpdate, updatedAt: Date.now() };
  const params = new URLSearchParams();
  Object.keys(docData).forEach((k) => params.append("updateMask.fieldPaths", k));

  await fsFetch(session, `${userPath(session, "settings", "preferences")}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(settingsCacheKey(session));
}
