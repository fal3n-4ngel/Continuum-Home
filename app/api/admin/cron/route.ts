import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/route-handlers";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/discord";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const POST = withAdmin("POST /api/admin/cron", async (req) => {
  const body = await req.json();
  const triggerType = body?.triggerType || body?.task; // "subscriptions" | "expenses_weekly" | "expenses_monthly" | "portfolio" | "recommendations"

  let cronPath = "";
  if (triggerType === "subscriptions") {
    cronPath = "/api/cron/subscriptions";
  } else if (triggerType === "expenses_weekly") {
    cronPath = "/api/cron/expenses?period=weekly";
  } else if (triggerType === "expenses_monthly") {
    cronPath = "/api/cron/expenses?period=monthly";
  } else if (triggerType === "portfolio") {
    cronPath = "/api/cron/portfolio";
  } else if (triggerType === "recommendations") {
    cronPath = "/api/cron/recommendations";
  } else {
    return NextResponse.json({ error: "Invalid trigger type." }, { status: 400 });
  }

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const cronUrl = `${origin}${cronPath}`;

  const cronRes = await fetch(cronUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CRON_SECRET}`,
    },
  });

  const data = await cronRes.json();
  if (!cronRes.ok) {
    return NextResponse.json({ error: data.error || "Cron trigger failed" }, { status: cronRes.status });
  }

  waitUntil(sendDiscordEmbed(
    "Admin Audit Log",
    `Admin manually triggered cron task: **${triggerType}**`,
    3447003, // Blue Hex
    "Continuum Dashboard • Admin Audit"
  ));

  return NextResponse.json({ success: true, response: data });
});
