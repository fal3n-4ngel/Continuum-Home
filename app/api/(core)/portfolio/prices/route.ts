import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchAssetPrice, getUsdToInrRate } from "@/lib/finance";
import { cacheGet, cacheSet } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface CacheEntry {
  priceUsd: number;
  priceInr: number;
  previousCloseInr: number | null;
  previousCloseUsd: number | null;
  timestamp: number;
}
const CACHE_TTL = 5 * 60 * 1000;
const REFRESH_COOLDOWN = 30 * 1000;

interface AssetPriceInput {
  category?: string;
  name?: string;
  mfSchemeCode?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const assets: AssetPriceInput[] = body?.assets || [];
    const forceRefresh = !!body?.forceRefresh;

    const uid = session.uid;
    const now = Date.now();
    const cooldownKey = `portfolio:refresh_cooldown:${uid}`;

    let isCooldownActive = false;
    let secondsLeft = 0;

    if (forceRefresh) {
      const lastRefresh = await cacheGet<number>(cooldownKey);
      if (lastRefresh) {
        const timePassed = now - lastRefresh;
        if (timePassed < REFRESH_COOLDOWN) {
          isCooldownActive = true;
          secondsLeft = Math.ceil((REFRESH_COOLDOWN - timePassed) / 1000);
        }
      }
      if (!isCooldownActive) {
        await cacheSet(cooldownKey, now, REFRESH_COOLDOWN);
      }
    }

    const usdToInr = await getUsdToInrRate();

    const updatedAssets = await Promise.all(assets.map(async (asset) => {
      const category = asset.category || "";
      const name = asset.name || "";
      const cacheKey = `portfolio:price:${category}:${name.trim().toUpperCase()}:${asset.mfSchemeCode || ""}`;
      const cached = await cacheGet<CacheEntry>(cacheKey);

      if ((!forceRefresh || isCooldownActive) && cached && (now - cached.timestamp < CACHE_TTL)) {
        return {
          ...asset,
          currentPrice: cached.priceInr,
          currentPriceUsd: cached.priceUsd,
          currentPriceInr: cached.priceInr,
          previousClose: cached.previousCloseInr,
          isFromCache: true
        };
      }

      const priceInfo = await fetchAssetPrice(category, name, usdToInr, asset.mfSchemeCode);
      if (priceInfo) {
        await cacheSet(cacheKey, {
          priceUsd: priceInfo.priceUsd,
          priceInr: priceInfo.priceInr,
          previousCloseInr: priceInfo.previousCloseInr,
          previousCloseUsd: priceInfo.previousCloseUsd,
          timestamp: now
        }, CACHE_TTL);
        return {
          ...asset,
          currentPrice: priceInfo.priceInr,
          currentPriceUsd: priceInfo.priceUsd,
          currentPriceInr: priceInfo.priceInr,
          previousClose: priceInfo.previousCloseInr,
          isFromCache: false
        };
      }

      if (cached) {
        return {
          ...asset,
          currentPrice: cached.priceInr,
          currentPriceUsd: cached.priceUsd,
          currentPriceInr: cached.priceInr,
          previousClose: cached.previousCloseInr,
          isFromCache: true
        };
      }

      return asset;
    }));

    return NextResponse.json({
      assets: updatedAssets,
      usdToInr,
      cooldownActive: isCooldownActive,
      cooldownSecondsLeft: secondsLeft
    });
  } catch (error) {
    console.error("Error in POST /api/portfolio/prices:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
