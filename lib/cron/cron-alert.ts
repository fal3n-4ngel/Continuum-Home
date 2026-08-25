// Cron fan-out failure reporting.
//
// Every cron route deliberately catches per-user errors and keeps going, so
// one broken account can't abort the run for everyone else. The cost of that
// is silence: the route still returns 200, so neither toErrorResponse() nor
// the GitHub Action's `curl --fail` check ever sees the failure. A cron could
// fail for every single user, every single day, and look perfectly healthy
// from the outside. This module is the only thing that surfaces those.

import { waitUntil } from "@vercel/functions";
import { postDiscordEmbed, codeBlock, DISCORD_RED, DISCORD_ORANGE } from "@/lib/integrations";

export interface CronUserResult {
  uid: string;
  email: string;
  sent: boolean;
  reason?: string;
  error?: string;
}

// Keeps the embed inside Discord's per-field limit while still naming the
// accounts involved — the uid is what you need to actually go debug one.
function formatFailures(failures: CronUserResult[]): string {
  const lines = failures.slice(0, 10).map((f) => `${f.email || f.uid}: ${f.error}`);
  if (failures.length > lines.length) {
    lines.push(`…and ${failures.length - lines.length} more`);
  }
  return codeBlock(lines.join("\n"));
}

// Reports any per-user failures from a completed cron fan-out. No-ops when
// every user succeeded, so a healthy run stays quiet.
export function reportCronFailures(job: string, results: CronUserResult[]): void {
  const failures = results.filter((r) => r.error);
  if (failures.length === 0) return;

  // Every user failing usually means a shared dependency is down (Resend,
  // Firestore, an upstream API) rather than anything account-specific.
  const isTotalFailure = failures.length === results.length;

  waitUntil(
    postDiscordEmbed({
      title: `${isTotalFailure ? "🚨" : "⚠️"} Cron Failures: ${job}`,
      color: isTotalFailure ? DISCORD_RED : DISCORD_ORANGE,
      fields: [
        { name: "Job", value: job, inline: true },
        { name: "Failed", value: `${failures.length} / ${results.length}`, inline: true },
        { name: "Errors", value: formatFailures(failures) },
      ],
      footer: {
        text: isTotalFailure
          ? "Continuum System • All users failed — check shared dependencies"
          : "Continuum System • Partial cron failure",
      },
    })
  );
}

// Reports a cron that couldn't start at all — a missing API key, an
// unreachable user list. These paths return early with a plain NextResponse
// instead of throwing, so they'd otherwise bypass alerting entirely.
export function reportCronAbort(job: string, reason: string): void {
  waitUntil(
    postDiscordEmbed({
      title: `🚨 Cron Aborted: ${job}`,
      color: DISCORD_RED,
      fields: [
        { name: "Job", value: job, inline: true },
        { name: "Reason", value: reason },
      ],
      footer: { text: "Continuum System • Cron could not run" },
    })
  );
}
