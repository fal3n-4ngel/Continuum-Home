import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/utils/route-handlers";
import {
  adminGetLatestReleaseNote,
  adminSaveReleaseNote,
  adminDeactivateReleaseNote,
  type ReleaseNoteRecord,
} from "@/lib/firebase/firebase-admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin("GET /api/admin/release-notes", async () => {
  const releaseNote = await adminGetLatestReleaseNote();
  return NextResponse.json({ releaseNote });
});

export const POST = withAdmin("POST /api/admin/release-notes", async (req, session) => {
  const body = await req.json().catch(() => ({}));
  const { version, title, content } = body;

  if (!version || typeof version !== "string" || !version.trim()) {
    return NextResponse.json({ error: "Missing or invalid version." }, { status: 400 });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Missing or invalid title." }, { status: 400 });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Missing or invalid content." }, { status: 400 });
  }

  const cleanVersion = version.trim();
  const id = `rel_${cleanVersion.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

  const record: ReleaseNoteRecord = {
    id,
    version: cleanVersion,
    title: title.trim(),
    content: content.trim(),
    publishedAt: Date.now(),
    active: true,
    publishedBy: session.user.email || undefined,
  };

  await adminSaveReleaseNote(record);

  return NextResponse.json({
    success: true,
    message: `Release notes for ${cleanVersion} published successfully.`,
    releaseNote: record,
  });
});

export const DELETE = withAdmin("DELETE /api/admin/release-notes", async () => {
  await adminDeactivateReleaseNote();
  return NextResponse.json({
    success: true,
    message: "Active release notes have been deactivated.",
  });
});
