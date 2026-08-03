import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const creds = await getCredentials(req);
    const config = parseFirebaseConfig(creds);

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const domainFromHost = host ? host.split(":")[0] : null;
    const isLocalhost = domainFromHost === "localhost" || domainFromHost === "127.0.0.1";

    // When hosted (e.g. continuum-home.vercel.app), use current host as authDomain
    // so Firebase Auth runs same-origin via Next.js rewrites in next.config.ts.
    const authDomain = !isLocalhost && domainFromHost
      ? domainFromHost
      : (config.authDomain || `${config.projectId}.firebaseapp.com`);

    // Return public Web SDK configuration fields
    const publicConfig = {
      apiKey: config.apiKey,
      authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    return NextResponse.json(publicConfig);
  } catch (error) {
    return toErrorResponse(error, "GET /api/auth/config");
  }
}
