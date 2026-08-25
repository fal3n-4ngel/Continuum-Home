// Single source for configuration that varies between deployments
// (Production / UAT / local dev). Routes read from here instead of repeating
// `process.env.X || fallback`, so adding an environment means editing one file.
//
// Values are getters, not constants: a frozen constant would capture whatever
// process.env held at first import, which breaks tests that set env vars per
// case and makes import order load-bearing.

export type Environment = "production" | "uat" | "development";

function resolveEnvironment(): Environment {
  const explicit = process.env.APP_ENV;
  if (explicit === "production" || explicit === "uat" || explicit === "development") return explicit;

  // Vercel sets VERCEL_ENV to production | preview | development. UAT is a
  // branch-aliased Preview deployment, so preview maps to uat.
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

  // VERCEL_URL is auto-populated per deployment, so this resolves sensibly
  // before APP_URL is explicitly set on a newly created environment.
  get APP_URL(): string {
    return process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
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

  // ADMIN_EMAIL is the server-side name; NEXT_PUBLIC_ADMIN_EMAIL is the same
  // identity exposed to the client. Both are accepted so neither spelling
  // silently falls back to the default. Client components must keep reading
  // NEXT_PUBLIC_ADMIN_EMAIL directly — Next.js inlines those at build time.
  get ADMIN_EMAIL(): string {
    return process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "adiad.dev@gmail.com";
  },
};

/**
 * Address that replaces every real recipient on non-production deployments.
 *
 * Deliberately keyed to an explicit env var rather than inferred from
 * ENVIRONMENT: if environment detection ever misfires, an explicit opt-in
 * fails closed (mail goes to the real user, as today) instead of silently
 * swallowing production mail into a test inbox.
 */
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

/**
 * Misconfigurations that are safe to boot with but worth surfacing. Returned
 * by the health cron rather than thrown, so a warning never takes a
 * deployment down.
 */
export function configWarnings(): string[] {
  const warnings: string[] = [];

  if (env.ENVIRONMENT !== "production" && !emailOverride()) {
    warnings.push(
      `${env.ENVIRONMENT} deployment has no UAT_TEST_EMAIL_OVERRIDE — cron email will reach real recipients.`
    );
  }
  if (env.ENVIRONMENT === "production" && emailOverride()) {
    warnings.push("UAT_TEST_EMAIL_OVERRIDE is set on PRODUCTION — all user email is being redirected.");
  }
  if (!process.env.APP_URL && !process.env.VERCEL_URL) {
    warnings.push("APP_URL is unset — unsubscribe links and email CTAs will point at localhost.");
  }
  if (!env.CRON_SECRET) {
    warnings.push("CRON_SECRET is unset — cron endpoints will reject every request.");
  }

  return warnings;
}
