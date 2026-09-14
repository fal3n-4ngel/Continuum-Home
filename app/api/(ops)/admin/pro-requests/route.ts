import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { getAdminDb, adminAddProUserByEmail } from "@/lib/firebase/firebase-admin";
import { cacheInvalidate } from "@/lib/utils";
import { env } from "@/lib/utils";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/integrations";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

async function assertAdmin(req: NextRequest) {
  const session = await requireUser(req);
  if (session.user.email !== ADMIN_EMAIL) {
    throw new ApiError(403, "Admin access required.");
  }
  return session;
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
    const db = getAdminDb();

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || "pending";

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

export async function POST(req: NextRequest) {
  try {
    const session = await assertAdmin(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid body");
    const { claimId, action, email } = body as Record<string, unknown>;

    if (action === "grant_by_email") {
      if (!email || typeof email !== "string") throw new ApiError(400, "email is required for grant_by_email");
      const res = await adminAddProUserByEmail(email, session.user.email);
      waitUntil(sendDiscordEmbed(
        "Admin Audit Log",
        `Admin **GRANTED PRO ACCESS** to \`${res.email}\`${res.isNewUser ? " (Pre-granted)" : ` (UID: \`${res.uid}\`)`}`,
        5763719,
        "Continuum Dashboard • Admin Audit"
      ));
      return NextResponse.json(res);
    }

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

    const now = Date.now();
    await claimRef.update({
      status: action === "approve" ? "approved" : "denied",
      reviewedAt: now,
    });

    if (action === "approve") {
      const uid = claimData.uid as string;
      const userPrefsRef = db.collection("users").doc(uid).collection("settings").doc("preferences");
      const userPrefsSnap = await userPrefsRef.get();

      if (userPrefsSnap.exists) {
        await userPrefsRef.update({ isPro: true, updatedAt: now });
      } else {
        await userPrefsRef.set({
          isPro: true,
          timeFilter: "all",
          salaryDay: 1,
          monthlySalary: 0,
          additionalIncome: 0,
          currency: "₹",
          reconciliations: {},
          salaryLog: {},
          aiOptOut: false,
          emailSubscriptions: { expenses: true, portfolio: false, subscriptions: true },
          updatedAt: now,
        });
      }
      await db.collection("users").doc(uid).set({ updatedAt: now }, { merge: true });

      if (claimData.email) {
        await db.collection("pro_grants").doc((claimData.email as string).toLowerCase()).set(
          {
            email: (claimData.email as string).toLowerCase(),
            uid,
            grantedBy: session.user.email,
            grantedAt: now,
            status: "active",
            source: "claim",
          },
          { merge: true }
        );
      }

      try {
        const rawConfig = env.FIREBASE_CONFIG;
        if (rawConfig) {
          const { projectId } = JSON.parse(rawConfig) as { projectId?: string };
          if (projectId) await cacheInvalidate(`settings:${projectId}:${uid}`);
        }
      } catch {
      }
    }

    waitUntil(sendDiscordEmbed(
      "Admin Audit Log",
      `Admin **${action === "approve" ? "APPROVED" : "DENIED"}** Pro claim for user: \`${claimData.email || claimData.uid}\``,
      action === "approve" ? 5763719 : 15548997,
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
