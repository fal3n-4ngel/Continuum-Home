import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import { getSettings, updateSettings } from "@/lib/firebase";
import { validateSettingsPatch } from "@/lib/firebase";
import { adminPurgeUserData } from "@/lib/firebase/firebase-admin";
import { recordDomainEvent } from "@/lib/domain-events/client";
import { DOMAIN_EVENTS } from "@/lib/domain-events/types";

import { postDiscordEmbed, DISCORD_GREEN } from "@/lib/integrations/discord";
import { env } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let settings = await getSettings(session);

    if (!settings) {
      const initialSettings = {
        timeFilter: "all" as const,
        salaryDay: 1,
        monthlySalary: 0,
        additionalIncome: 0,
        currency: "₹",
        reconciliations: {},
        salaryLog: {},
        emailSubscriptions: { expenses: true, portfolio: false, subscriptions: true },
      };

      await updateSettings(session, initialSettings);
      settings = await getSettings(session);

      recordDomainEvent({
        eventType: DOMAIN_EVENTS.USER_CREATED,
        userId: session.uid,
        userEmail: session.user.email,
        payload: {
          displayName: session.user.displayName,
          email: session.user.email,
          createdAt: Date.now(),
        },
      });

      postDiscordEmbed({
        title: "🎉 New User Registration!",
        description: `A new user joined Continuum: **${session.user.displayName || session.user.email || session.uid}**`,
        color: DISCORD_GREEN,
        fields: [
          { name: "Email", value: session.user.email || "N/A", inline: true },
          { name: "User ID", value: session.uid, inline: true },
          { name: "Environment", value: env.ENVIRONMENT || "production", inline: true },
        ],
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error("[DiscordAlert] Failed to dispatch new user alert:", err));
    }

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

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser(req);

    recordDomainEvent({
      eventType: DOMAIN_EVENTS.USER_DELETED,
      userId: session.uid,
      userEmail: session.user.email,
      payload: {
        timestamp: Date.now(),
        action: "account_deleted",
      },
    });

    await adminPurgeUserData(session.uid);

    return NextResponse.json({ success: true, message: "Account data permanently deleted." });
  } catch (error) {
    return toErrorResponse(error, "DELETE /api/settings");
  }
}
