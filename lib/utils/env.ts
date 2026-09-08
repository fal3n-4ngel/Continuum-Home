
export type Environment = "production" | "uat" | "development";

function isUatConfigEnabled(): boolean {
  return process.env.USE_UAT_CONFIG === "true";
}

const UAT_OVERRIDABLE = [
  "FIREBASE_CONFIG",
  "FIREBASE_SERVICE_ACCOUNT",
  "ENCRYPTION_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "APP_URL",
] as const;

type Overridable = (typeof UAT_OVERRIDABLE)[number];

function pick(name: Overridable): string | undefined {
  if (isUatConfigEnabled()) {
    const override = process.env[`UAT_${name}`];
    if (override) return override;
  }
  return process.env[name];
}

function resolveEnvironment(): Environment {
  if (isUatConfigEnabled()) return "uat";

  const explicit = process.env.APP_ENV;
  if (explicit === "production" || explicit === "uat" || explicit === "development") return explicit;

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
    return isUatConfigEnabled();
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

export function resolveEmailRecipient(realEmail: string): { to: string; subjectPrefix: string } {
  const override = emailOverride();
  if (!override) return { to: realEmail, subjectPrefix: "" };
  return { to: override, subjectPrefix: `[UAT→${realEmail}] ` };
}

export function configWarnings(): string[] {
  const warnings: string[] = [];

  if (isUatConfigEnabled() && process.env.VERCEL_ENV === "production") {
    warnings.push("USE_UAT_CONFIG=true on a PRODUCTION deployment — production traffic is reading UAT data.");
  }
  if (env.ENVIRONMENT !== "production" && !emailOverride()) {
    warnings.push(`${env.ENVIRONMENT} deployment has no UAT_TEST_EMAIL_OVERRIDE — cron email will reach real recipients.`);
  }
  if (env.ENVIRONMENT === "production" && emailOverride()) {
    warnings.push("UAT_TEST_EMAIL_OVERRIDE is set on PRODUCTION — all user email is being redirected.");
  }
  if (!process.env.APP_URL && !process.env.VERCEL_URL && !isUatConfigEnabled()) {
    warnings.push("APP_URL is unset — unsubscribe links and email CTAs will point at localhost.");
  }
  if (!env.CRON_SECRET) {
    warnings.push("CRON_SECRET is unset — cron endpoints will reject every request.");
  }

  return warnings;
}
