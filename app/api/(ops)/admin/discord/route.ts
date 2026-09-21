import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";

import { postDiscordEmbed, resolveWebhookUrl, ALERT_COLORS, type AlertChannel } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { message, channel } = await req.json().catch(() => ({}));
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
    }

    const targetChannel: AlertChannel = channel === "alerts" ? "alerts" : "events";
    const webhookUrl = resolveWebhookUrl(targetChannel);
    if (!webhookUrl) {
      return NextResponse.json(
        { error: `Discord webhook URL for channel '${targetChannel}' is not configured.` },
        { status: 500 }
      );
    }

    await postDiscordEmbed(
      {
        title: "System Notification",
        description: message,
        color: ALERT_COLORS.BLUE,
        footer: {
          text: "Continuum Dashboard • Manual Trigger",
        },
      },
      targetChannel
    );

    return NextResponse.json({ success: true, message: `Discord alert dispatched to '${targetChannel}' channel.` });
  } catch (error) {
    return toErrorResponse(error, "POST /api/admin/discord");
  }
}
