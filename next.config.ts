import type { NextConfig } from "next";

function getFirebaseProjectId(): string {
  try {
    if (process.env.FIREBASE_CONFIG) {
      const parsed = JSON.parse(process.env.FIREBASE_CONFIG);
      if (parsed.projectId) return parsed.projectId;
    }
  } catch {}
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "personal-hub-adi";
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.logo.dev" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const projectId = getFirebaseProjectId();
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${projectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
