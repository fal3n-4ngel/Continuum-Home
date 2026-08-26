import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { updateWatchlistItem, deleteWatchlistItem } from "@/lib/firebase";
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

    const patch = validateWatchlistPatch(body);
    const result = await updateWatchlistItem(session, id, patch);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.WATCHLIST_UPDATED,
      userId: session.uid,
      entityId: id,
      // `status` is the field worth analysing over time (want → watching → done), so it
      // ships as a value rather than just a changed-field name.
      payload: { fields: Object.keys(patch), status: patch.status },
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
    const result = await deleteWatchlistItem(session, id);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.WATCHLIST_REMOVED,
      userId: session.uid,
      entityId: id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/watchlist/[id]");
  }
}
