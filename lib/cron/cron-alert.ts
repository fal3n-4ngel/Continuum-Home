
import { waitUntil } from "@vercel/functions";
import { postDiscordEmbed, codeBlock, DISCORD_RED, DISCORD_ORANGE } from "@/lib/integrations";

export interface CronUserResult {
  uid: string;
  email: string;
  sent: boolean;
  reason?: string;
  error?: string;
}

function formatFailures(failures: CronUserResult[]): string {
  const lines = failures.slice(0, 10).map((f) => `${f.email || f.uid}: ${f.error}`);
  if (failures.length > lines.length) {
    lines.push(`…and ${failures.length - lines.length} more`);
  }
  return codeBlock(lines.join("\n"));
}

export function reportCronFailures(job: string, results: CronUserResult[]): void {
  const failures = results.filter((r) => r.error);
  if (failures.length === 0) return;

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
