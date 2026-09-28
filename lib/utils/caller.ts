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

export function getRequestChannel(req: NextRequest): "chatgpt_plugin" | "custom_gpt" | "web" {
  const clientHeader = (req.headers.get("x-client") || "").toLowerCase();
  if (clientHeader.includes("plugin") || clientHeader.includes("chatgpt_plugin") || clientHeader.includes("mcp")) {
    return "chatgpt_plugin";
  }
  if (isCustomGptRequest(req)) {
    return "custom_gpt";
  }
  return "web";
}
