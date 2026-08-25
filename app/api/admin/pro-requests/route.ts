import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { getAdminDb } from "@/lib/firebase-admin";
import { cacheInvalidate } from "@/lib/cache";
import { env } from "@/lib/env";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/discord";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

async function assertAdmin(req: NextRequest) {
  const session = await requireUser(req);
  if (session.user.email !== ADMIN_EMAIL) {
    throw new ApiError(403, "Admin access required.");
  }
  return session;
}

// GET — list all pro claims (admin only)
export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
    const db = getAdminDb();

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || "pending";

    // Fetch ordered by submittedAt only (no composite index needed) and filter
    // by status in JS — pro_claims collection stays small so this is fine.
    const snap = await db.collection("pro_claims").orderBy("submittedAt", "desc").limit(200).get();
    let claims = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (statusFilter !== "all") {
      claims = claims.filter((c: any) => c.status === statusFilter);
    }

    return NextResponse.json({ claims });
  } catch (error) {
    return toErrorResponse(error, "GET /api/admin/pro-requests");
  }
}

// POST — approve or deny a specific claim (admin only)
export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid body");
    const { claimId, action } = body as Record<string, unknown>;

    if (!claimId || typeof claimId !== "string") throw new ApiError(400, "claimId is required");
    if (!action || !["approve", "deny"].includes(action as string)) {
      throw new ApiError(400, "action must be 'approve' or 'deny'");
    }

    const db = getAdminDb();
    const claimRef = db.collection("pro_claims").doc(claimId);
    const claimDoc = await claimRef.get();

    if (!claimDoc.exists) throw new ApiError(404, "Claim not found");

    const claimData = claimDoc.data()!;
    if (claimData.status !== "pending") {
      throw new ApiError(409, `Claim is already ${claimData.status}`);
    }

    // Update the claim status
    await claimRef.update({
      status: action === "approve" ? "approved" : "denied",
      reviewedAt: Date.now(),
    });

    // If approving, flip isPro on their settings document
    if (action === "approve") {
      const uid = claimData.uid as string;
      const settingsRef = db.collection("settings").doc(uid);
      const settingsSnap = await settingsRef.get();

      if (settingsSnap.exists) {
        await settingsRef.update({ isPro: true, updatedAt: Date.now() });
      } else {
        await settingsRef.set({
          isPro: true,
          timeFilter: "all",
          salaryDay: 1,
          monthlySalary: 0,
          additionalIncome: 0,
          updatedAt: Date.now(),
        });
      }

      // Bust settings cache so the user gets the new value on next load
      // Cache key mirrors the pattern in lib/firebase.ts: settings:<projectId>:<uid>
      try {
        const rawConfig = env.FIREBASE_CONFIG;
        if (rawConfig) {
          const { projectId } = JSON.parse(rawConfig) as { projectId?: string };
          if (projectId) await cacheInvalidate(`settings:${projectId}:${uid}`);
        }
      } catch {
        // Non-fatal — cache will expire naturally
      }
    }

    waitUntil(sendDiscordEmbed(
      "Admin Audit Log",
      `Admin **${action === "approve" ? "APPROVED" : "DENIED"}** Pro claim for user: \`${claimData.email || claimData.uid}\``,
      action === "approve" ? 5763719 : 15548997, // Green for approve, Red for deny
      "Continuum Dashboard • Admin Audit"
    ));

    return NextResponse.json({
      success: true,
      message: action === "approve"
        ? "Pro access granted! The user's account has been upgraded."
        : "Claim denied.",
    });
  } catch (error) {
    return toErrorResponse(error, "POST /api/admin/pro-requests");
  }
}
