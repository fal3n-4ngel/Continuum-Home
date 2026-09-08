import { NextRequest } from "next/server";

export function isCustomGptRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get("user-agent") || "";
  const clientHeader = req.headers.get("x-client") || "";
  return (
    userAgent.includes("ChatGPT-User") ||
    userAgent.includes("OpenAI-GPT") ||
    clientHeader.includes("gpt") ||
    clientHeader.includes("custom-gpt")
  );
}
