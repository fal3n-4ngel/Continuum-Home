import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { getSettings, updateSettings } from "@/lib/firebase";
import { validateSettingsPatch } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const settings = await getSettings(session);
    return NextResponse.json(settings || { timeFilter: "all", salaryDay: 1 });
  } catch (error) {
    return toErrorResponse(error, "GET /api/settings");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const patch = validateSettingsPatch(body);
    await updateSettings(session, patch);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/settings");
  }
}
