import { Session } from "@/lib/auth";
import { ApiError, cacheGet, cacheSet, cacheInvalidate, encrypt, decrypt } from "@/lib/utils";
import {
  assertDocId,
  docsRoot,
  fsFetch,
  FirestoreDocument,
  toFields,
  fromFields,
} from "../client";

export type FdCompounding = "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface InvestmentAsset {
  id: string;
  name: string;
  category: "equity" | "crypto" | "mutual_fund" | "sip" | "gold" | "cash" | "fixed_deposit" | "other";
  amount: number;
  investedAmount: number;
  quantity?: number;
  buyPrice?: number;
  currentPrice?: number;
  previousClose?: number | null;
  notes?: string;
  createdAt?: number;
  isSold?: boolean;
  soldAt?: number;
  soldPrice?: number;
  mfSchemeCode?: string;
  interestRate?: number;
  startDate?: string;
  maturityDate?: string;
  compounding?: FdCompounding;
  sipDay?: number;
}

export interface PortfolioRecord {
  id: string;
  assets: InvestmentAsset[];
  updatedAt: number;
  valuationHistory?: Record<string, number>;
}

const PORTFOLIO_CACHE_TTL = 3_600_000;

export function portfolioCacheKey(session: Session): string {
  return `portfolio:${session.config.projectId}:${session.uid}`;
}

function decryptNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const parsed = typeof raw === "string" ? parseFloat(decrypt(raw)) : Number(raw);
  return isNaN(parsed) ? undefined : parsed;
}

export function encryptAsset(a: InvestmentAsset): Record<string, unknown> {
  return {
    id: a.id,
    name: encrypt(a.name || ""),
    category: encrypt(a.category || "equity"),
    amount: encrypt(String(a.amount)),
    investedAmount: encrypt(String(a.investedAmount)),
    quantity: a.quantity !== undefined ? encrypt(String(a.quantity)) : null,
    buyPrice: a.buyPrice !== undefined ? encrypt(String(a.buyPrice)) : null,
    currentPrice: a.currentPrice !== undefined ? encrypt(String(a.currentPrice)) : null,
    previousClose: a.previousClose !== undefined && a.previousClose !== null ? encrypt(String(a.previousClose)) : null,
    notes: a.notes ? encrypt(a.notes) : null,
    createdAt: a.createdAt ?? null,
    isSold: a.isSold ?? null,
    soldAt: a.soldAt ?? null,
    soldPrice: a.soldPrice !== undefined ? encrypt(String(a.soldPrice)) : null,
    mfSchemeCode: a.mfSchemeCode ? encrypt(a.mfSchemeCode) : null,
    interestRate: a.interestRate !== undefined ? encrypt(String(a.interestRate)) : null,
    startDate: a.startDate ? encrypt(a.startDate) : null,
    maturityDate: a.maturityDate ? encrypt(a.maturityDate) : null,
    compounding: a.compounding ?? null,
    sipDay: a.sipDay !== undefined ? encrypt(String(a.sipDay)) : null,
  };
}

export function decryptAsset(a: Record<string, unknown>): InvestmentAsset {
  const amount = decryptNumber(a.amount) ?? 0;
  return {
    id: String(a.id || ""),
    name: typeof a.name === "string" ? decrypt(a.name) : String(a.name || ""),
    category: (typeof a.category === "string" ? (decrypt(a.category) as InvestmentAsset["category"]) : undefined) || "equity",
    amount,
    investedAmount: decryptNumber(a.investedAmount) ?? amount,
    quantity: decryptNumber(a.quantity),
    buyPrice: decryptNumber(a.buyPrice),
    currentPrice: decryptNumber(a.currentPrice),
    previousClose: a.previousClose !== undefined && a.previousClose !== null ? decryptNumber(a.previousClose) ?? null : null,
    notes: typeof a.notes === "string" ? decrypt(a.notes) || undefined : undefined,
    createdAt: a.createdAt !== undefined && a.createdAt !== null ? Number(a.createdAt) : undefined,
    isSold: a.isSold !== undefined && a.isSold !== null ? Boolean(a.isSold) : undefined,
    soldAt: a.soldAt !== undefined && a.soldAt !== null ? Number(a.soldAt) : undefined,
    soldPrice: decryptNumber(a.soldPrice),
    mfSchemeCode: typeof a.mfSchemeCode === "string" ? decrypt(a.mfSchemeCode) || undefined : undefined,
    interestRate: decryptNumber(a.interestRate),
    startDate: typeof a.startDate === "string" ? decrypt(a.startDate) || undefined : undefined,
    maturityDate: typeof a.maturityDate === "string" ? decrypt(a.maturityDate) || undefined : undefined,
    compounding: typeof a.compounding === "string" ? (a.compounding as FdCompounding) : undefined,
    sipDay: decryptNumber(a.sipDay),
  };
}

export function encryptValuationHistory(vh: Record<string, number>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [date, value] of Object.entries(vh)) out[date] = encrypt(String(value));
  return out;
}

export function decryptValuationHistory(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [date, value] of Object.entries(raw)) out[date] = decryptNumber(value) ?? 0;
  return out;
}

export async function getPortfolio(session: Session): Promise<PortfolioRecord | null> {
  const cacheKey = portfolioCacheKey(session);
  const cached = await cacheGet<PortfolioRecord | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/portfolios/${session.uid}`);
    const data = fromFields(res.fields || {});
    const assetsRaw = Array.isArray(data.assets) ? (data.assets as Record<string, unknown>[]) : [];
    const assets: InvestmentAsset[] = assetsRaw.map(decryptAsset);

    const valHistoryRaw = data.valuationHistory && typeof data.valuationHistory === "object" ? data.valuationHistory : {};
    const valuationHistory = decryptValuationHistory(valHistoryRaw as Record<string, unknown>);

    const record = { id: session.uid, assets, updatedAt: Number(data.updatedAt || 0), valuationHistory };
    await cacheSet(cacheKey, record, PORTFOLIO_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, PORTFOLIO_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updatePortfolio(session: Session, assets: InvestmentAsset[]) {
  const docData = { assets: assets.map(encryptAsset), updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "assets");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/portfolios/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(portfolioCacheKey(session));
}

export async function updatePortfolioAsset(session: Session, assetId: string, updates: Partial<InvestmentAsset>) {
  assertDocId(assetId, "portfolio asset");
  const portfolio = await getPortfolio(session);
  if (!portfolio || !portfolio.assets) {
    throw new ApiError(404, "Portfolio not found.");
  }
  const index = portfolio.assets.findIndex((a) => a.id === assetId);
  if (index === -1) {
    throw new ApiError(404, "Asset not found in portfolio.");
  }

  const updatedAssets = [...portfolio.assets];
  updatedAssets[index] = {
    ...portfolio.assets[index],
    ...updates,
  };

  await updatePortfolio(session, updatedAssets);
  return { id: assetId };
}

export async function deletePortfolioAsset(session: Session, assetId: string) {
  assertDocId(assetId, "portfolio asset");
  const portfolio = await getPortfolio(session);
  if (!portfolio || !portfolio.assets) {
    throw new ApiError(404, "Portfolio not found.");
  }
  const filteredAssets = portfolio.assets.filter((a) => a.id !== assetId);
  if (filteredAssets.length === portfolio.assets.length) {
    throw new ApiError(404, "Asset not found in portfolio.");
  }
  await updatePortfolio(session, filteredAssets);
  return { id: assetId };
}

export async function updatePortfolioValuationHistory(
  session: Session,
  valuationHistory: Record<string, number>
) {
  const docData = { valuationHistory: encryptValuationHistory(valuationHistory), updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "valuationHistory");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/portfolios/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(portfolioCacheKey(session));
}
