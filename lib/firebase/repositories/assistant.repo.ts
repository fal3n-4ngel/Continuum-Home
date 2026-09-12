import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet } from "@/lib/utils";
import { docsRoot, fsFetch, FirestoreDocument, toFields, fromFields, userPath } from "../client";

export interface DailyRecommendation {
  type: "movie" | "show" | "anime" | "book";
  title: string;
  releaseYear?: string;
  author?: string;
  synopsis: string;
  rationale: string;
  score?: number | string | null;
  coverImage?: string | null;
  isLogged?: boolean;
  date: string;
}

const RECOMMENDATIONS_CACHE_TTL = 3_600_000;

export function recommendationCacheKey(session: Session, type: string, date: string): string {
  return `recommendation:${session.config.projectId}:${session.uid}:${type}:${date}`;
}

export async function getDailyRecommendation(
  session: Session,
  type: string,
  date: string
): Promise<DailyRecommendation | null> {
  const cacheKey = recommendationCacheKey(session, type, date);
  const cached = await cacheGet<DailyRecommendation>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const docPath = userPath(session, "recommendations", "entries", `${type}_${date}`);
    const snap = await fsFetch<FirestoreDocument>(session, docPath);
    const data = fromFields(snap.fields || {}) as unknown as DailyRecommendation;
    await cacheSet(cacheKey, data, RECOMMENDATIONS_CACHE_TTL);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await cacheSet(cacheKey, null, RECOMMENDATIONS_CACHE_TTL);
      return null;
    }
    throw error;
  }
}

export async function saveDailyRecommendation(
  session: Session,
  type: string,
  date: string,
  recommendation: DailyRecommendation
): Promise<void> {
  const cacheKey = recommendationCacheKey(session, type, date);

  const expireAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const docData = {
    ...recommendation,
    expireAt,
  };

  const docPath = userPath(session, "recommendations", "entries", `${type}_${date}`);
  const body = {
    fields: toFields(docData),
  };

  await fsFetch(session, docPath, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  await cacheSet(cacheKey, docData as unknown as DailyRecommendation, RECOMMENDATIONS_CACHE_TTL);
}

export interface HealthAnalyticsReport {
  trendStatus: string;
  trendSeverity: "good" | "neutral" | "warning";
  executiveSummary: string;
  topCategories: { category: string; amount: number; percentage: number }[];
  spendTrends: string[];
  anomalies: string[];
  savingOpportunities: string[];
  safeSpendAdvice: string;
  fingerprint: string;
  updatedAt: number;
}

const HEALTH_ANALYTICS_CACHE_TTL = 3_600_000;

export function healthAnalyticsCacheKey(session: Session): string {
  return `health_analytics:${session.config.projectId}:${session.uid}`;
}

export async function getHealthAnalytics(session: Session): Promise<HealthAnalyticsReport | null> {
  const cacheKey = healthAnalyticsCacheKey(session);
  const cached = await cacheGet<HealthAnalyticsReport>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const docPath = userPath(session, "recommendations", "entries", "health_analytics");
    const snap = await fsFetch<FirestoreDocument>(session, docPath);
    const data = fromFields(snap.fields || {}) as unknown as HealthAnalyticsReport;
    await cacheSet(cacheKey, data, HEALTH_ANALYTICS_CACHE_TTL);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await cacheSet(cacheKey, null, HEALTH_ANALYTICS_CACHE_TTL);
      return null;
    }
    throw error;
  }
}

export async function saveHealthAnalytics(
  session: Session,
  report: HealthAnalyticsReport
): Promise<void> {
  const cacheKey = healthAnalyticsCacheKey(session);
  const docPath = userPath(session, "recommendations", "entries", "health_analytics");
  const body = {
    fields: toFields(report as any),
  };

  await fsFetch(session, docPath, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  await cacheSet(cacheKey, report, HEALTH_ANALYTICS_CACHE_TTL);
}
