import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import { adminCleanupLegacyCollections } from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export const POST = withAdmin("POST /api/admin/cleanup-legacy", async () => {
  try {
    const result = await adminCleanupLegacyCollections();
    return NextResponse.json({
      success: true,
      message: `Pruned ${result.deletedCount} legacy document(s) from Firestore.`,
      deletedCount: result.deletedCount,
      collections: result.collections,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to prune legacy collections." },
      { status: 500 }
    );
  }
});
