import { DiscordEmbedField, ErrorNoticeOptions, ALERT_COLORS } from "./types";
import { codeBlock, postDiscordEmbed, dispatchBackground } from "./dispatcher";
import { env } from "@/lib/utils/env";

const STATUS_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
};

export function notifyError(options: ErrorNoticeOptions): void;
export function notifyError(context: string, error: unknown, status?: number): void;
export function notifyError(
  contextOrOpts: string | ErrorNoticeOptions,
  rawError?: unknown,
  rawStatus?: number
): void {
  if (typeof window !== "undefined" && !process.env.VITEST) return;

  let context = "";
  let error: unknown;
  let status = 500;
  let extraFields: Record<string, string> | undefined;
  let isCritical = false;

  if (typeof contextOrOpts === "object" && contextOrOpts !== null) {
    context = contextOrOpts.context;
    error = contextOrOpts.error;
    status = contextOrOpts.status ?? 500;
    extraFields = contextOrOpts.extraFields;
    isCritical = contextOrOpts.isCritical ?? (status >= 500);
  } else {
    context = contextOrOpts;
    error = rawError;
    status = rawStatus ?? 500;
    isCritical = status >= 500;
  }

  if (status === 401 || status === 404) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";

  const fields: DiscordEmbedField[] = [
    { name: "Context", value: context || "Global Catch", inline: true },
    { name: "Status", value: `${status} (${STATUS_LABELS[status] || "Error"})`, inline: true },
    { name: "Environment", value: env.ENVIRONMENT, inline: true },
    { name: "Message", value: errorMessage },
  ];

  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      fields.push({ name: k, value: v, inline: true });
    }
  }

  if (stack && status >= 500) {
    fields.push({ name: "Stack Trace", value: codeBlock(stack) });
  }

  dispatchBackground(async () => {
    await postDiscordEmbed(
      {
        title: `🚨 System Alert: ${context}`,
        color: isCritical ? ALERT_COLORS.RED : ALERT_COLORS.ORANGE,
        fields,
        footer: { text: "Continuum System • Universal Error Catching Wrapper" },
      },
      "alerts"
    );
  });
}

export function withErrorCatch<T extends (...args: any[]) => Promise<any>>(
  context: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (err) {
      notifyError({ context, error: err });
      throw err;
    }
  }) as T;
}
