import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { updateWatchlistItem, deleteWatchlistItem, getWatchlistItem } from "@/lib/firebase";
import { validateWatchlistPatch } from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser(req);
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const existing = await getWatchlistItem(session, id);
    const patch = validateWatchlistPatch(body);
    const result = await updateWatchlistItem(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.WATCHLIST_UPDATED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        fields: Object.keys(patch),
        title: patch.title ?? existing?.title,
        type: patch.type ?? existing?.type,
        status: patch.status ?? existing?.status,
        rating: patch.rating !== undefined ? patch.rating : existing?.rating,
        progress: patch.progress !== undefined ? patch.progress : existing?.progress,
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/watchlist/[id]");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser(req);
    const { id } = await params;
    const existing = await getWatchlistItem(session, id);
    const result = await deleteWatchlistItem(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.WATCHLIST_REMOVED,
      userId: session.uid,
      entityId: id,
      userEmail: session.user.email,
      payload: {
        ...(existing
          ? {
              title: existing.title,
              type: existing.type,
              status: existing.status,
              rating: existing.rating,
              year: existing.year,
              progress: existing.progress,
            }
          : {}),
        deletedAt: Date.now(),
      },
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/watchlist/[id]");
  }
}
