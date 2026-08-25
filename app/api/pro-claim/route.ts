import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { getAdminDb } from "@/lib/firebase/firebase-admin";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid body");
    const { platform, handle, note } = body as Record<string, unknown>;

    if (!platform || !handle || typeof handle !== "string" || handle.trim().length === 0) {
      throw new ApiError(400, "platform and handle are required");
    }
    if (!["github", "bmac"].includes(platform as string)) {
      throw new ApiError(400, "platform must be 'github' or 'bmac'");
    }
    const sanitizedHandle = handle.trim().slice(0, 200);
    const sanitizedNote = typeof note === "string" ? note.trim().slice(0, 500) : "";

    const db = getAdminDb();

    // Check if user already has an open/pending request — query by uid only
    // to avoid needing a composite index; filter by status in JS.
    const existingSnap = await db
      .collection("pro_claims")
      .where("uid", "==", session.uid)
      .limit(10)
      .get();

    const hasPending = existingSnap.docs.some((d) => d.data().status === "pending");
    if (hasPending) {
      return NextResponse.json(
        { error: "You already have a pending Pro request. Please wait for it to be reviewed." },
        { status: 409 }
      );
    }

    // Check if user is already pro
    const settingsDoc = await db.collection("settings").doc(session.uid).get();
    if (settingsDoc.exists && settingsDoc.data()?.isPro === true) {
      return NextResponse.json({ error: "Your account is already a Pro account." }, { status: 409 });
    }

    await db.collection("pro_claims").add({
      uid: session.uid,
      email: session.user.email || null,
      displayName: session.user.displayName || null,
      platform,
      handle: sanitizedHandle,
      note: sanitizedNote,
      status: "pending",
      submittedAt: Date.now(),
      reviewedAt: null,
    });

    waitUntil(sendDiscordEmbed(
      "Admin Audit Log",
      `🔔 **NEW PRO REQUEST**\nUser \`${session.user.email || session.uid}\` requested Pro status via ${platform} (Handle: ${sanitizedHandle}).\nCheck the Admin Panel to approve or deny.`,
      16776960, // Yellow Hex
      "Continuum Dashboard • Admin Audit"
    ));

    return NextResponse.json({ success: true, message: "Your Pro request has been submitted. We'll review it shortly!" });
  } catch (error) {
    return toErrorResponse(error, "POST /api/pro-claim");
  }
}

// GET — let the user check their own claim status
export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const db = getAdminDb();

    const snap = await db
      .collection("pro_claims")
      .where("uid", "==", session.uid)
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ claim: null });
    }

    const doc = snap.docs[0];
    const data = doc.data();
    return NextResponse.json({
      claim: {
        id: doc.id,
        platform: data.platform,
        handle: data.handle,
        status: data.status,
        submittedAt: data.submittedAt,
      },
    });
  } catch (error) {
    return toErrorResponse(error, "GET /api/pro-claim");
  }
}
