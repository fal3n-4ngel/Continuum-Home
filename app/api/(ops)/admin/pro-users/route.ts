import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse, cacheInvalidate, env } from "@/lib/utils";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/firebase-admin";
import { postDiscordEmbed, ALERT_COLORS } from "@/lib/alerts";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

async function assertAdmin(req: NextRequest) {
  const session = await requireUser(req);
  if (session.user.email !== ADMIN_EMAIL) {
    throw new ApiError(403, "Admin access required.");
  }
  return session;
}

export interface ProUserRecord {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  isPro: boolean;
  proSince?: number | null;
  createdAt?: string | null;
  claimSource?: {
    platform: string;
    handle: string;
    submittedAt: number;
    claimId: string;
  } | null;
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
    const auth = getAdminAuth();
    const db = getAdminDb();

    // 1. Fetch all Firebase Auth users
    const authUsers: Array<{
      uid: string;
      email?: string;
      displayName?: string;
      photoURL?: string;
      createdAt?: string;
    }> = [];

    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const u of page.users) {
        authUsers.push({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || undefined,
          photoURL: u.photoURL || undefined,
          createdAt: u.metadata?.creationTime,
        });
      }
      pageToken = page.pageToken;
    } while (pageToken);

    // 2. Fetch approved claims for cross-referencing
    const claimsSnap = await db.collection("pro_claims").where("status", "==", "approved").get();
    const approvedClaimsMap = new Map<string, { platform: string; handle: string; submittedAt: number; claimId: string }>();
    claimsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.uid) {
        approvedClaimsMap.set(data.uid, {
          platform: data.platform || "manual",
          handle: data.handle || "N/A",
          submittedAt: data.submittedAt || data.reviewedAt || Date.now(),
          claimId: doc.id,
        });
      }
    });

    // 3. Inspect preferences for each user in parallel
    const userChecks = await Promise.all(
      authUsers.map(async (u) => {
        try {
          let settingsDoc = await db.collection("users").doc(u.uid).collection("settings").doc("preferences").get();
          if (!settingsDoc.exists) {
            settingsDoc = await db.collection("settings").doc(u.uid).get();
          }

          if (settingsDoc.exists) {
            const data = settingsDoc.data();
            if (data?.isPro === true) {
              const claimSource = approvedClaimsMap.get(u.uid) || null;
              return {
                uid: u.uid,
                email: u.email || "No Email",
                displayName: u.displayName || null,
                photoURL: u.photoURL || null,
                isPro: true,
                proSince: data.updatedAt || claimSource?.submittedAt || null,
                createdAt: u.createdAt || null,
                claimSource,
              } as ProUserRecord;
            }
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const proUsers = userChecks.filter((u): u is ProUserRecord => u !== null);

    return NextResponse.json({
      proUsers,
      totalCount: proUsers.length,
    });
  } catch (error) {
    return toErrorResponse(error, "GET /api/admin/pro-users");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await assertAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { action, emailOrUid, uid: targetUid } = body;

    if (!action || !["grant", "revoke"].includes(action)) {
      throw new ApiError(400, "action must be 'grant' or 'revoke'");
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    let resolvedUid = targetUid;
    let resolvedEmail = "";

    if (action === "grant") {
      if (!emailOrUid && !targetUid) {
        throw new ApiError(400, "emailOrUid is required to grant Pro access");
      }
      const identifier = String(emailOrUid || targetUid).trim();

      try {
        if (identifier.includes("@")) {
          const userRecord = await auth.getUserByEmail(identifier);
          resolvedUid = userRecord.uid;
          resolvedEmail = userRecord.email || identifier;
        } else {
          const userRecord = await auth.getUser(identifier);
          resolvedUid = userRecord.uid;
          resolvedEmail = userRecord.email || identifier;
        }
      } catch (err: any) {
        throw new ApiError(404, `User not found in Firebase Auth: ${identifier}`);
      }
    } else {
      if (!resolvedUid) {
        throw new ApiError(400, "uid is required to revoke Pro access");
      }
      try {
        const u = await auth.getUser(resolvedUid);
        resolvedEmail = u.email || resolvedUid;
      } catch {
        resolvedEmail = resolvedUid;
      }
    }

    // Update settings preferences
    const settingsRef = db.collection("users").doc(resolvedUid).collection("settings").doc("preferences");
    const settingsSnap = await settingsRef.get();

    const isPro = action === "grant";

    if (settingsSnap.exists) {
      await settingsRef.set({ isPro, updatedAt: Date.now() }, { merge: true });
    } else {
      const legacyRef = db.collection("settings").doc(resolvedUid);
      const legacySnap = await legacyRef.get();
      if (legacySnap.exists) {
        await settingsRef.set(
          { ...legacySnap.data(), isPro, updatedAt: Date.now() },
          { merge: true }
        );
      } else {
        await settingsRef.set(
          {
            isPro,
            timeFilter: "all",
            salaryDay: 1,
            monthlySalary: 0,
            additionalIncome: 0,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    }

    // Invalidate Redis cache
    try {
      const rawConfig = env.FIREBASE_CONFIG;
      if (rawConfig) {
        const { projectId } = JSON.parse(rawConfig) as { projectId?: string };
        if (projectId) await cacheInvalidate(`settings:${projectId}:${resolvedUid}`);
      }
    } catch {}

    // Dispatch notification to Discord admin channel
    await postDiscordEmbed(
      {
        title: isPro ? "⭐ Pro Access Granted Directly" : "⛔ Pro Access Revoked",
        description: `Admin **${isPro ? "GRANTED" : "REVOKED"}** Pro access for user: \`${resolvedEmail}\` (\`${resolvedUid}\`)`,
        color: isPro ? ALERT_COLORS.GREEN : ALERT_COLORS.RED,
        fields: [
          { name: "Action", value: isPro ? "Granted" : "Revoked", inline: true },
          { name: "Target User", value: resolvedEmail, inline: true },
          { name: "Executed By", value: session.user.email || env.ADMIN_EMAIL, inline: true },
        ],
        footer: { text: "Continuum Dashboard • Admin Audit" },
      },
      "admin"
    );

    return NextResponse.json({
      success: true,
      message: isPro
        ? `Pro access granted to ${resolvedEmail}.`
        : `Pro access revoked for ${resolvedEmail}.`,
      uid: resolvedUid,
      isPro,
    });
  } catch (error) {
    return toErrorResponse(error, "POST /api/admin/pro-users");
  }
}
