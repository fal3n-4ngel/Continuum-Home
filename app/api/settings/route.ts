import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { getSettings, updateSettings } from "@/lib/firebase";
import { validateSettingsPatch } from "@/lib/firebase";
import { recordDomainEvent } from "@/lib/domain-events/client";
import { DOMAIN_EVENTS } from "@/lib/domain-events/types";

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

    // Dispatch Monolith Audit Telemetry for Salary Updates & Preference Logs
    if (patch.monthlySalary !== undefined || patch.salaryDay !== undefined) {
      recordDomainEvent({
        eventType: DOMAIN_EVENTS.SALARY_UPDATED,
        userId: session.uid,
        userEmail: session.user.email,
        payload: {
          monthlySalary: patch.monthlySalary,
          salaryDay: patch.salaryDay,
        },
      });
    }

    if (patch.salaryLog !== undefined) {
      recordDomainEvent({
        eventType: DOMAIN_EVENTS.SALARY_LOGGED,
        userId: session.uid,
        userEmail: session.user.email,
        payload: {
          entriesCount: Object.keys(patch.salaryLog || {}).length,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/settings");
  }
}
