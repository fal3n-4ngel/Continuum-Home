import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/utils";
import { ApiError } from "@/lib/utils";
import { waitUntil } from "@vercel/functions";
import { sendDiscordEmbed } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ||"";

    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!redis) {
      return NextResponse.json(
        { error: "Redis cache is not active or configured on this server." },
        { status: 500 }
      );
    }

    const res = await redis.flushdb();

    waitUntil(sendDiscordEmbed(
      "Admin Audit Log",
      `Admin flushed the global Redis cache.`,
      15105570, // Orange Hex
      "Continuum Dashboard • Admin Audit"
    ));

    return NextResponse.json({ success: true, message: "Redis cache flushed successfully.", result: res });
  } catch (error: any) {
    console.error("Error flushing admin Redis cache:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to flush cache" }, { status: 500 });
  }
}
