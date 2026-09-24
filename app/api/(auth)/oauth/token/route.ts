import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    let grantType: string | null = null;
    let code: string | null = null;
    let clientRefreshToken: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      grantType = json.grant_type || null;
      code = json.code || null;
      clientRefreshToken = json.refresh_token || null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      grantType = params.get("grant_type");
      code = params.get("code");
      clientRefreshToken = params.get("refresh_token");
    }

    if (!grantType) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing grant_type." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (grantType === "authorization_code") {
      if (!code) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Missing authorization code." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!redis) {
        return NextResponse.json(
          { error: "server_error", error_description: "Database offline." },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      const cacheKey = `oauth:code:${code}`;
      const refreshToken = await redis.get<string>(cacheKey);

      if (!refreshToken) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid or expired authorization code." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      await redis.del(cacheKey);

      return NextResponse.json(
        {
          access_token: refreshToken,
          token_type: "Bearer",
          refresh_token: refreshToken,
          expires_in: 315360000,
        },
        { headers: CORS_HEADERS }
      );
    }

    if (grantType === "refresh_token") {
      if (!clientRefreshToken) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Missing refresh_token." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      return NextResponse.json(
        {
          access_token: clientRefreshToken,
          token_type: "Bearer",
          refresh_token: clientRefreshToken,
          expires_in: 315360000,
        },
        { headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Grant type not supported." },
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("OAuth Token Exchange failed:", error);
    return NextResponse.json(
      { error: "server_error", error_description: error.message || "Failed to exchange token" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
