import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";
    
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Discord webhook URL is not configured." }, { status: 500 });
    }

    const payload = {
      username: "Continuum Alerts",
      embeds: [
        {
          title: "System Notification",
          description: message,
          color: 13944497, // Hex #d4c6b1 (sepia theme color)
          timestamp: new Date().toISOString(),
          footer: {
            text: "Continuum Dashboard • Manual Trigger"
          }
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Discord API returned ${res.status}`);
    }

    return NextResponse.json({ success: true, message: "Discord alert dispatched." });
  } catch (error) {
    return toErrorResponse(error, "POST /api/admin/discord");
  }
}
