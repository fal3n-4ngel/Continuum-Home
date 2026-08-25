import type { NextConfig } from "next";

// Mirrors the USE_UAT_CONFIG flip in lib/env.ts. This runs at build time, so
// it cannot import that module — without this the /__/auth rewrite would still
// proxy to production Firebase while the running app talked to UAT.
function getFirebaseProjectId(): string {
  const raw =
    (process.env.USE_UAT_CONFIG === "true" && process.env.UAT_FIREBASE_CONFIG) ||
    process.env.FIREBASE_CONFIG;
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.projectId) return parsed.projectId;
    }
  } catch {}
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "personal-hub-adi";
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self' http://localhost:3000 http://localhost:3001 https://*.vercel.app https://monolith.adithyakrishnan.com;" },
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
