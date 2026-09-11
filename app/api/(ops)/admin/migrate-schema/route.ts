import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import {
  adminMigrateFirestoreArchitecture,
  adminPruneMigratedLegacyRecords,
} from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export const POST = withAdmin("POST /api/admin/migrate-schema", async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const prune = Boolean(body?.prune);

    if (prune && !dryRun) {
      const pruneResult = await adminPruneMigratedLegacyRecords();
      return NextResponse.json({
        success: true,
        message: `Pruned ${pruneResult.prunedCount} legacy records across ${pruneResult.collections.join(", ")}.`,
        pruneResult,
      });
    }

    const summary = await adminMigrateFirestoreArchitecture(dryRun);
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to execute schema migration." },
      { status: 500 }
    );
  }
});
