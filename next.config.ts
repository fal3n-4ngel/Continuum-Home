import type { NextConfig } from "next";

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
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  }
  if (process.env.CI || process.env.NODE_ENV === "test") {
    return "demo-project";
  }
  throw new Error(
    "Missing Firebase Project ID: Please set FIREBASE_CONFIG or NEXT_PUBLIC_FIREBASE_PROJECT_ID in your environment."
  );
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
  devIndicators: false,
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
  async redirects() {
    return [
      {
        source: "/security.txt",
        destination: "/.well-known/security.txt",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
