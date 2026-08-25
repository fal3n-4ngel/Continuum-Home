import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { env, isUatDeployment, resolveEmailRecipient, configWarnings } from "@/lib/env";

const KEYS = ["APP_ENV", "VERCEL_ENV", "VERCEL_URL", "APP_URL", "UAT_TEST_EMAIL_OVERRIDE", "CRON_SECRET", "ADMIN_EMAIL", "NEXT_PUBLIC_ADMIN_EMAIL"] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

describe("environment resolution", () => {
  it("maps Vercel preview deployments to uat and production to production", () => {
    process.env.VERCEL_ENV = "preview";
    expect(env.ENVIRONMENT).toBe("uat");
    expect(isUatDeployment()).toBe(true);

    process.env.VERCEL_ENV = "production";
    expect(env.ENVIRONMENT).toBe("production");
    expect(env.IS_PRODUCTION).toBe(true);
  });

  it("defaults to development off-Vercel", () => {
    expect(env.ENVIRONMENT).toBe("development");
  });

  it("lets APP_ENV override Vercel's inference", () => {
    process.env.VERCEL_ENV = "production";
    process.env.APP_ENV = "uat";
    expect(env.ENVIRONMENT).toBe("uat");
  });

  it("ignores an unrecognised APP_ENV rather than trusting it", () => {
    process.env.APP_ENV = "staging-ish";
    process.env.VERCEL_ENV = "production";
    expect(env.ENVIRONMENT).toBe("production");
  });
});

describe("APP_URL", () => {
  it("prefers explicit APP_URL, then VERCEL_URL, then localhost", () => {
    expect(env.APP_URL).toBe("http://localhost:3000");
    process.env.VERCEL_URL = "uat-continuum-home.vercel.app";
    expect(env.APP_URL).toBe("https://uat-continuum-home.vercel.app");
    process.env.APP_URL = "https://continuum-home.vercel.app";
    expect(env.APP_URL).toBe("https://continuum-home.vercel.app");
  });
});

describe("ADMIN_EMAIL", () => {
  // Both spellings existed in the codebase; neither may silently fall through
  // to the default just because the other one was the one that got set.
  it("accepts either the server or the public spelling", () => {
    process.env.ADMIN_EMAIL = "ops@example.com";
    expect(env.ADMIN_EMAIL).toBe("ops@example.com");

    delete process.env.ADMIN_EMAIL;
    process.env.NEXT_PUBLIC_ADMIN_EMAIL = "public@example.com";
    expect(env.ADMIN_EMAIL).toBe("public@example.com");
  });
});

describe("email redirection", () => {
  it("passes mail straight through when no override is set", () => {
    expect(resolveEmailRecipient("real@user.com")).toEqual({ to: "real@user.com", subjectPrefix: "" });
  });

  it("redirects and tags the intended recipient when overridden", () => {
    process.env.UAT_TEST_EMAIL_OVERRIDE = "tester@example.com";
    expect(resolveEmailRecipient("real@user.com")).toEqual({
      to: "tester@example.com",
      subjectPrefix: "[UAT→real@user.com] ",
    });
  });

  // Redirection is opt-in via env var, not inferred from ENVIRONMENT: a
  // misfiring environment probe must never swallow production mail.
  it("does not redirect on a uat deployment that lacks the override", () => {
    process.env.VERCEL_ENV = "preview";
    expect(resolveEmailRecipient("real@user.com").to).toBe("real@user.com");
  });
});

describe("configWarnings", () => {
  it("warns when a non-production deployment can reach real inboxes", () => {
    process.env.VERCEL_ENV = "preview";
    expect(configWarnings().join()).toContain("no UAT_TEST_EMAIL_OVERRIDE");
  });

  it("warns loudly when production is redirecting user mail", () => {
    process.env.VERCEL_ENV = "production";
    process.env.UAT_TEST_EMAIL_OVERRIDE = "tester@example.com";
    expect(configWarnings().join()).toContain("set on PRODUCTION");
  });

  it("warns when APP_URL would make unsubscribe links point at localhost", () => {
    expect(configWarnings().join()).toContain("APP_URL is unset");
  });

  it("warns when CRON_SECRET is missing", () => {
    expect(configWarnings().join()).toContain("CRON_SECRET is unset");
  });

  it("stays silent on a correctly configured production deployment", () => {
    process.env.VERCEL_ENV = "production";
    process.env.APP_URL = "https://continuum-home.vercel.app";
    process.env.CRON_SECRET = "s3cret";
    expect(configWarnings()).toEqual([]);
  });
});
