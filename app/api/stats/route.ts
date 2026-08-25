import { NextResponse } from "next/server";
import { listAllUsers } from "@/lib/firebase/firebase-admin";
import { cacheGet, cacheSet } from "@/lib/utils";

// Public, non-personalized, and safe to go stale for an hour — let Next/Vercel
// cache the response at the edge so most requests never invoke this function
// at all. The Redis layer below is the fallback for whatever falls through
// that edge cache (revalidation requests, self-hosted deploys without a CDN).
export const revalidate = 3600;

const STATS_CACHE_KEY = "stats:public:user_count";
const STATS_CACHE_TTL = 60 * 60 * 1000; // 1h, matches `revalidate` above.
const CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

// Public, unauthenticated: intentionally returns only a count, never emails/uids.
export async function GET() {
  try {
    const cached = await cacheGet<number>(STATS_CACHE_KEY);
    if (cached !== undefined) {
      return NextResponse.json({ userCount: cached }, { headers: { "Cache-Control": CACHE_CONTROL } });
    }

    const users = await listAllUsers();
    await cacheSet(STATS_CACHE_KEY, users.length, STATS_CACHE_TTL);
    return NextResponse.json({ userCount: users.length }, { headers: { "Cache-Control": CACHE_CONTROL } });
  } catch (error: any) {
    console.error("Error in /api/stats:", error);
    return NextResponse.json({ userCount: null }, { status: 200 });
  }
}
