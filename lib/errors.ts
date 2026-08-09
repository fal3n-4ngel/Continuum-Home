import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { postDiscordEmbed, codeBlock, DISCORD_RED, DISCORD_ORANGE, type DiscordEmbedField } from "./discord";

// Error with an HTTP status, safe to surface to the client verbatim.
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATUS_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
};

async function sendDiscordAlert(context: string, error: unknown, status: number) {
  // Don't alert on 401/404 to avoid spam, but DO alert on 400 (bad request from GPT) and 500
  if (status === 401 || status === 404) return;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : "";

  const fields: DiscordEmbedField[] = [
    { name: "Context", value: context, inline: true },
    { name: "Status", value: status.toString(), inline: true },
    { name: "Message", value: errorMessage },
  ];

  if (stack && status === 500) {
    fields.push({ name: "Stack Trace", value: codeBlock(stack) });
  }

  await postDiscordEmbed({
    title: `🚨 API Alert: ${STATUS_LABELS[status] || "Error"}`,
    color: status === 500 ? DISCORD_RED : DISCORD_ORANGE,
    fields,
    footer: { text: "Continuum System • Automated Error Trigger" },
  });
}

// Maps any thrown value to a JSON error response. Only ApiError messages are
// exposed; anything else is logged server-side and returned as an opaque 500 so
// internals (stack traces, upstream URLs, config details) never leak.
export function toErrorResponse(error: unknown, context: string): NextResponse {
  let status = 500;
  
  if (error instanceof ApiError) {
    status = error.status;
    waitUntil(sendDiscordAlert(context, error, status));
    
    return NextResponse.json(
      { error: STATUS_LABELS[status] || "Error", message: error.message },
      { status }
    );
  }

  console.error(`${context}:`, error);
  waitUntil(sendDiscordAlert(context, error, status));
  
  return NextResponse.json(
    { error: "Internal Server Error", message: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

