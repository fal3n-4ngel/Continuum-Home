import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { bulkSyncWatchlist } from "@/lib/firebase";
import { validateSyncPayload } from "@/lib/firebase";
import { redis } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    // Distributed lock to prevent race conditions (double-sync bugs)
    const lockKey = `sync:lock:watchlist:${session.uid}`;
    if (redis) {
      const acquired = await redis.set(lockKey, "1", { nx: true, px: 30000 });
      if (!acquired) {
        throw new ApiError(409, "A sync operation is already in progress. Please wait a moment.");
      }
    }

    try {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        throw new ApiError(400, "Invalid JSON body");
      }

      const { source, entries } = validateSyncPayload(body);
      const result = await bulkSyncWatchlist(session, source, entries);
      return NextResponse.json({ success: true, ...result });
    } finally {
      if (redis) {
        await redis.del(lockKey);
      }
    }
  } catch (error) {
    return toErrorResponse(error, "POST /api/watchlist/sync");
  }
}
