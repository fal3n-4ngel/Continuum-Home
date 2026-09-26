import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/utils";
import crypto from "crypto";

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
    let codeVerifier: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      grantType = json.grant_type || null;
      code = json.code || null;
      clientRefreshToken = json.refresh_token || null;
      codeVerifier = json.code_verifier || null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      grantType = params.get("grant_type");
      code = params.get("code");
      clientRefreshToken = params.get("refresh_token");
      codeVerifier = params.get("code_verifier");
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
      const rawStored = await redis.get<any>(cacheKey);

      if (!rawStored) {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Invalid or expired authorization code." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      let refreshToken: string;
      let codeChallenge: string | null = null;
      let codeChallengeMethod: string | null = null;

      if (typeof rawStored === "string") {
        try {
          const parsed = JSON.parse(rawStored);
          refreshToken = parsed.refreshToken;
          codeChallenge = parsed.codeChallenge || null;
          codeChallengeMethod = parsed.codeChallengeMethod || null;
        } catch {
          refreshToken = rawStored;
        }
      } else if (typeof rawStored === "object" && rawStored !== null) {
        refreshToken = (rawStored as any).refreshToken;
        codeChallenge = (rawStored as any).codeChallenge || null;
        codeChallengeMethod = (rawStored as any).codeChallengeMethod || null;
      } else {
        return NextResponse.json(
          { error: "invalid_grant", error_description: "Malformed authorization code record." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // PKCE Validation (RFC 7636)
      if (codeChallenge) {
        if (!codeVerifier) {
          return NextResponse.json(
            { error: "invalid_grant", error_description: "Missing PKCE code_verifier." },
            { status: 400, headers: CORS_HEADERS }
          );
        }

        if (codeChallengeMethod === "S256" || !codeChallengeMethod) {
          const computedChallenge = crypto
            .createHash("sha256")
            .update(codeVerifier)
            .digest("base64url");

          if (computedChallenge !== codeChallenge) {
            return NextResponse.json(
              { error: "invalid_grant", error_description: "Invalid PKCE code_verifier." },
              { status: 400, headers: CORS_HEADERS }
            );
          }
        } else if (codeChallengeMethod === "plain") {
          if (codeVerifier !== codeChallenge) {
            return NextResponse.json(
              { error: "invalid_grant", error_description: "Invalid PKCE code_verifier." },
              { status: 400, headers: CORS_HEADERS }
            );
          }
        }
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
