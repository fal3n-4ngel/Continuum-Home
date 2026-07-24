import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { ApiError } from "@/lib/errors";
import { listAllUsers } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await requireUser(req);
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";

    if (session.user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    if (!redis) {
      return NextResponse.json({ error: "Redis cache is offline." }, { status: 500 });
    }

    // 2. Fetch GPT metrics from Redis
    const totalCallsRaw = await redis.get<string>("metrics:gpt:total_calls");
    const totalCalls = Number(totalCallsRaw) || 0;

    const usersSet = await redis.smembers("metrics:gpt:users_set");
    const userLastActive = await redis.hgetall("metrics:gpt:user_last_active") as Record<string, string> || {};

    // GPT users authenticated via a long-lived refresh token/API key have no
    // email on their session (see trackGptMetrics in lib/auth.ts), so the
    // Redis set stores their raw Firebase uid instead. Resolve those to a
    // real email for display via the Admin SDK; entries that are already an
    // email (from the ID-token auth path) pass through untouched.
    const uidsToResolve = usersSet.filter((identifier) => !identifier.includes("@"));
    const uidToEmail = new Map<string, string>();
    if (uidsToResolve.length > 0) {
      try {
        const allUsers = await listAllUsers();
        for (const u of allUsers) uidToEmail.set(u.uid, u.email);
      } catch (e) {
        console.error("Failed to resolve GPT metric uids via Admin SDK:", e);
      }
    }

    // 3. Compile users details list
    const usersList = usersSet.map((identifier) => {
      const lastActiveMs = Number(userLastActive[identifier]) || 0;
      const email = identifier.includes("@") ? identifier : uidToEmail.get(identifier) || identifier;
      return {
        email,
        lastActive: lastActiveMs ? new Date(lastActiveMs).toISOString() : null,
      };
    }).sort((a, b) => {
      const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return timeB - timeA; // newest active first
    });

    // 4. Fetch daily usage for the last 7 days
    const dailyUsage: { date: string; calls: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const count = await redis.get<string>(`metrics:gpt:daily_calls:${dayStr}`);
      dailyUsage.push({
        date: dayStr,
        calls: Number(count) || 0,
      });
    }

    return NextResponse.json({
      success: true,
      totalCalls,
      activeUsersCount: usersSet.length,
      users: usersList,
      dailyUsage,
    });
  } catch (error: any) {
    console.error("Error fetching admin metrics:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch metrics" }, { status: 500 });
  }
}
