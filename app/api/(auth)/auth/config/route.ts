import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/auth/credentials";
import { toErrorResponse } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const creds = await getCredentials(req);
    const config = parseFirebaseConfig(creds);

    const authDomain = config.authDomain || `${config.projectId}.firebaseapp.com`;

    const publicConfig = {
      apiKey: config.apiKey,
      authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || null,
    };

    return NextResponse.json(publicConfig);
  } catch (error) {
    return toErrorResponse(error, "GET /api/auth/config");
  }
}
