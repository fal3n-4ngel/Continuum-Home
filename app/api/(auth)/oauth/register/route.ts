import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cacheSet } from "@/lib/utils";
import { isAllowedOAuthRedirect } from "@/lib/auth/oauth-clients";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const DCR_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "invalid_client_metadata", error_description: "Request body must be a JSON object." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Invalid JSON body." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const rawRedirects = body.redirect_uris;
  if (!Array.isArray(rawRedirects) || rawRedirects.length === 0) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const redirectUris: string[] = [];
  for (const item of rawRedirects) {
    if (typeof item !== "string" || !item.startsWith("https://")) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "All redirect_uris must be valid HTTPS URLs." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    try {
      new URL(item);
    } catch {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "Malformed redirect_uri." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    if (!isAllowedOAuthRedirect("dcr", item)) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: "Redirect URI host is not permitted." },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    redirectUris.push(item);
  }

  const clientId = `dcr_${crypto.randomBytes(16).toString("hex")}`;
  const issuedAt = Math.floor(Date.now() / 1000);
  const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 120) : "MCP Client";
  const grantTypes = ["authorization_code", "refresh_token"];
  const responseTypes = ["code"];
  const tokenEndpointAuthMethod = "none";

  await cacheSet(
    `oauth:dcr:${clientId}`,
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      client_id_issued_at: issuedAt,
    },
    DCR_TTL_MS
  );

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: issuedAt,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
    },
    { status: 201, headers: CORS_HEADERS }
  );
}
