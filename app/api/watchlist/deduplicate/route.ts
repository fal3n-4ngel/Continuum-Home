import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { getRawWatchlist, writeWatchlistItems, watchlistCacheKey } from "@/lib/firebase";
import { cacheInvalidate } from "@/lib/cache";
import { WatchlistItem } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON payload");
    }

    const { primaryId, duplicateIds, mergedData } = body;

    if (!primaryId || typeof primaryId !== "string") {
      throw new ApiError(400, "Missing or invalid primaryId");
    }
    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      throw new ApiError(400, "Missing or invalid duplicateIds array");
    }
    if (!mergedData || typeof mergedData !== "object") {
      throw new ApiError(400, "Missing or invalid mergedData");
    }

    // Verify ownership
    const itemsMap = await getRawWatchlist(session);
    if (!itemsMap[primaryId]) {
      throw new ApiError(404, "Primary item not found or not owned by user");
    }
    for (const dupId of duplicateIds) {
      if (!itemsMap[dupId]) {
        throw new ApiError(404, `Duplicate item ${dupId} not found or not owned by user`);
      }
    }

    const now = Date.now();
    const patches: Record<string, Record<string, unknown> | null> = {};

    // Apply merged updates to the primary item
    patches[primaryId] = {
      ...mergedData,
      updatedAt: now,
    };

    // Delete duplicates by setting their patch to null
    for (const dupId of duplicateIds) {
      patches[dupId] = null;
    }

    await writeWatchlistItems(session, patches, new Set());
    await cacheInvalidate(watchlistCacheKey(session));

    return NextResponse.json({ success: true, merged: 1, deleted: duplicateIds.length });
  } catch (error) {
    return toErrorResponse(error, "POST /api/watchlist/deduplicate");
  }
}
