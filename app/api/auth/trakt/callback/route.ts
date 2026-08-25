import { NextRequest, NextResponse } from "next/server";
import { getCredentials } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  const origin = `${proto}://${host}`;
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?trakt_error=${encodeURIComponent("Missing authorization code")}`);
  }

  try {
    const creds = await getCredentials(req);
    if (!creds.traktClientId || !creds.traktClientSecret) {
      throw new Error("Trakt client credentials are not configured on the server.");
    }

    const redirectUri = creds.redirectUri || `${origin}/api/auth/trakt/callback`;

    const res = await fetch("https://api.trakt.tv/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        code,
        client_id: creds.traktClientId,
        client_secret: creds.traktClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`Trakt token exchange failed (${res.status}):`, errText.slice(0, 500));
      throw new Error(`Trakt token exchange failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const tokens = await res.json();
    const hash =
      `trakt_access_token=${encodeURIComponent(tokens.access_token)}` +
      `&trakt_refresh_token=${encodeURIComponent(tokens.refresh_token)}` +
      `&trakt_expires_in=${tokens.expires_in}`;

    return NextResponse.redirect(`${origin}/#${hash}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trakt sign-in failed.";
    return NextResponse.redirect(`${origin}/?trakt_error=${encodeURIComponent(message)}`);
  }
}
