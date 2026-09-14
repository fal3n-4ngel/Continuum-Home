import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import {
  adminAddProUserByEmail,
  adminRevokeProUserByEmail,
  adminListProUsers,
} from "@/lib/firebase/firebase-admin";
import { ApiError, env } from "@/lib/utils";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export const GET = withAdmin("GET /api/admin/pro-users", async () => {
  const proUsers = await adminListProUsers();
  let projectId = "";
  try {
    const raw = env.FIREBASE_CONFIG;
    if (raw) projectId = JSON.parse(raw).projectId || "";
  } catch {}
  return NextResponse.json({
    proUsers,
    projectId,
    environment: env.ENVIRONMENT,
  });
});

export const POST = withAdmin("POST /api/admin/pro-users", async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }

  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Invalid body.");
  }

  const { email } = body as Record<string, unknown>;
  if (!email || typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  const result = await adminAddProUserByEmail(email, session.user.email);

  try {
    waitUntil(
      sendDiscordEmbed(
        "Admin Audit Log",
        `Admin **GRANTED PRO ACCESS** to \`${result.email}\`${
          result.isNewUser ? " (Pre-granted pending registration)" : ` (UID: \`${result.uid}\`)`
        }`,
        5763719,
        "Continuum Dashboard • Admin Audit"
      )
    );
  } catch {}

  return NextResponse.json(result);
});

export const DELETE = withAdmin("DELETE /api/admin/pro-users", async (req, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }

  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Invalid body.");
  }

  const { email } = body as Record<string, unknown>;
  if (!email || typeof email !== "string" || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  const result = await adminRevokeProUserByEmail(email, session.user.email);

  try {
    waitUntil(
      sendDiscordEmbed(
        "Admin Audit Log",
        `Admin **REVOKED PRO ACCESS** for \`${result.email}\``,
        15548997,
        "Continuum Dashboard • Admin Audit"
      )
    );
  } catch {}

  return NextResponse.json(result);
});
