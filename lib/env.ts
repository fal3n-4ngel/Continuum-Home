// Per-deployment configuration (Production / UAT / local dev).
// Getters, not constants: tests mutate process.env between cases, and a
// frozen constant would pin whatever was set at first import.

export type Environment = "production" | "uat" | "development";

function useUatConfig(): boolean {
  return process.env.USE_UAT_CONFIG === "true";
}

// Data-plane only — the variables that decide which dataset you touch. Shared
// infrastructure (Resend, Discord) is deliberately excluded.
const UAT_OVERRIDABLE = [
  "FIREBASE_CONFIG",
  "FIREBASE_SERVICE_ACCOUNT",
  "ENCRYPTION_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "APP_URL",
] as const;

type Overridable = (typeof UAT_OVERRIDABLE)[number];

/** Resolves `UAT_<NAME>` ahead of `<NAME>` while the UAT flip is on. */
function pick(name: Overridable): string | undefined {
  if (useUatConfig()) {
    const override = process.env[`UAT_${name}`];
    if (override) return override;
  }
  return process.env[name];
}

function resolveEnvironment(): Environment {
  // UAT config means UAT data, so report UAT — this is what makes Discord
  // alerts and the health endpoint truthful when flipped locally.
  if (useUatConfig()) return "uat";

  const explicit = process.env.APP_ENV;
  if (explicit === "production" || explicit === "uat" || explicit === "development") return explicit;

  // UAT is a branch-aliased Preview deployment.
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "uat";
  return "development";
}

export const env = {
  get ENVIRONMENT(): Environment {
    return resolveEnvironment();
  },
  get IS_PRODUCTION(): boolean {
    return resolveEnvironment() === "production";
  },
  get USE_UAT_CONFIG(): boolean {
    return useUatConfig();
  },

  get APP_URL(): string {
    return pick("APP_URL") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  },
  get CRON_SENDER_EMAIL(): string {
    return process.env.CRON_SENDER_EMAIL || "Personal Dashboard <onboarding@resend.dev>";
  },
  get RESEND_API_KEY(): string {
    return process.env.RESEND_API_KEY || "";
  },
  get CRON_SECRET(): string {
    return process.env.CRON_SECRET || "";
  },

  get FIREBASE_CONFIG(): string {
    return pick("FIREBASE_CONFIG") || "";
  },
  get FIREBASE_SERVICE_ACCOUNT(): string {
    return pick("FIREBASE_SERVICE_ACCOUNT") || "";
  },
  get ENCRYPTION_KEY(): string {
    return pick("ENCRYPTION_KEY") || "";
  },
  get UPSTASH_REDIS_REST_URL(): string {
    return pick("UPSTASH_REDIS_REST_URL") || "";
  },
  get UPSTASH_REDIS_REST_TOKEN(): string {
    return pick("UPSTASH_REDIS_REST_TOKEN") || "";
  },

  // Both spellings accepted so neither silently falls through to the default.
  // Client components must read NEXT_PUBLIC_ADMIN_EMAIL directly — Next.js
  // inlines those at build time.
  get ADMIN_EMAIL(): string {
    return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";
  },
};

function emailOverride(): string {
  return process.env.UAT_TEST_EMAIL_OVERRIDE || "";
}

export function isUatDeployment(): boolean {
  return env.ENVIRONMENT === "uat";
}

/**
 * Redirects every recipient on non-production deployments.
 * Keyed to an explicit env var rather than ENVIRONMENT so a misfiring
 * environment probe fails closed — mail reaches the real user instead of
 * production mail vanishing into a test inbox.
 */
export function resolveEmailRecipient(realEmail: string): { to: string; subjectPrefix: string } {
  const override = emailOverride();
  if (!override) return { to: realEmail, subjectPrefix: "" };
  return { to: override, subjectPrefix: `[UAT→${realEmail}] ` };
}

/** Misconfigurations safe to boot with. Reported by the health cron, never thrown. */
export function configWarnings(): string[] {
  const warnings: string[] = [];

  if (useUatConfig() && process.env.VERCEL_ENV === "production") {
    warnings.push("USE_UAT_CONFIG=true on a PRODUCTION deployment — production traffic is reading UAT data.");
  }
  if (env.ENVIRONMENT !== "production" && !emailOverride()) {
    warnings.push(`${env.ENVIRONMENT} deployment has no UAT_TEST_EMAIL_OVERRIDE — cron email will reach real recipients.`);
  }
  if (env.ENVIRONMENT === "production" && emailOverride()) {
    warnings.push("UAT_TEST_EMAIL_OVERRIDE is set on PRODUCTION — all user email is being redirected.");
  }
  if (!process.env.APP_URL && !process.env.VERCEL_URL && !useUatConfig()) {
    warnings.push("APP_URL is unset — unsubscribe links and email CTAs will point at localhost.");
  }
  if (!env.CRON_SECRET) {
    warnings.push("CRON_SECRET is unset — cron endpoints will reject every request.");
  }

  return warnings;
}
