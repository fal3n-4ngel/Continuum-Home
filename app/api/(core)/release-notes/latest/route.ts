import { NextResponse } from "next/server";
import { adminGetLatestReleaseNote } from "@/lib/firebase/firebase-admin";
import { toErrorResponse } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const releaseNote = await adminGetLatestReleaseNote();
    return NextResponse.json({ releaseNote });
  } catch (error) {
    return toErrorResponse(error, "GET /api/release-notes/latest");
  }
}
