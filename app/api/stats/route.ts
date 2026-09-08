import { NextResponse } from "next/server";
import { adminGetUserCount } from "@/lib/firebase/firebase-admin";
import { cacheGet, cacheSet } from "@/lib/utils";

export const revalidate = 3600;

const STATS_CACHE_KEY = "stats:public:user_count";
const STATS_CACHE_TTL = 60 * 60 * 1000;
const CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  try {
    const cached = await cacheGet<number>(STATS_CACHE_KEY);
    if (cached !== undefined) {
      return NextResponse.json({ userCount: cached }, { headers: { "Cache-Control": CACHE_CONTROL } });
    }

    const userCount = await adminGetUserCount();
    await cacheSet(STATS_CACHE_KEY, userCount, STATS_CACHE_TTL);
    return NextResponse.json({ userCount: userCount }, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (error: any) {
    console.error("Error in /api/stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
