const GROQ_TOOL_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter(Boolean) as string[];

const GROQ_JSON_MODELS = [
  process.env.GROQ_JSON_MODEL,
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
].filter(Boolean) as string[];

export function sanitizeAiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || "");
  const lower = msg.toLowerCase();

  if (
    lower.includes("503") ||
    lower.includes("service unavailable") ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand") ||
    lower.includes("overloaded")
  ) {
    return "The AI assistant is experiencing high demand right now. Please try again in a moment.";
  }

  if (
    lower.includes("429") ||
    lower.includes("too many requests") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("itpm") ||
    lower.includes("tokens per minute") ||
    lower.includes("request too large")
  ) {
    return "Daily AI request quota reached. Please try again later.";
  }

  if (lower.includes("busy") || lower.includes("wait a minute") || lower.includes("too quickly")) {
    return msg;
  }

  if (lower.includes("does not exist") || lower.includes("model_not_found") || lower.includes("not have access")) {
    return "The configured AI model is unavailable. Please check your Groq API configuration.";
  }

  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econnrefused")) {
    return "Network connection issue. Please verify your connection and try again.";
  }

  return "The assistant encountered a temporary issue. Please try again in a moment.";
}

export function convertHistoryToGroqMessages(
  history: any[],
  newMessage: string,
  systemInstruction?: string
): any[] {
  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }

  const recentHistory = (history || []).slice(-8);
  for (const item of recentHistory) {
    const role = item.role === "model" || item.role === "assistant" ? "assistant" : "user";
    let text =
      item.parts?.map((p: any) => p.text || "").filter(Boolean).join("\n") ||
      item.content ||
      "";
    if (text.length > 1500) {
      text = `${text.slice(0, 1500)}...`;
    }
    if (text) {
      messages.push({ role, content: text });
    }
  }

  messages.push({ role: "user", content: newMessage });
  return messages;
}

export async function executeGroqChatWithTools({
  messages,
  tools,
  executeTool,
  maxAttempts = 5,
}: {
  messages: any[];
  tools: any[];
  executeTool: (name: string, args: any) => Promise<any>;
  maxAttempts?: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  let lastError: any;
  for (const model of GROQ_TOOL_MODELS) {
    try {
      const currentMessages = [...messages];
      let attempts = 0;

      while (attempts < maxAttempts) {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: currentMessages,
            tools: tools.length > 0 ? tools : undefined,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Groq API responded with status ${res.status}`);
        }

        const data = await res.json();
        const choice = data.choices?.[0]?.message;
        if (!choice) {
          throw new Error("Empty response choice received from Groq");
        }

        if (choice.tool_calls && choice.tool_calls.length > 0) {
          for (const tc of choice.tool_calls) {
            let parsedArgs: any = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || "{}");
              if (parsedArgs && typeof parsedArgs === "object" && !Array.isArray(parsedArgs)) {
                for (const k of Object.keys(parsedArgs)) {
                  if (parsedArgs[k] === null || parsedArgs[k] === undefined) {
                    delete parsedArgs[k];
                  }
                }
              }
              tc.function.arguments = JSON.stringify(parsedArgs);
            } catch {}
          }
          currentMessages.push(choice);
          for (const tc of choice.tool_calls) {
            let parsedArgs: any = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || "{}");
            } catch {}
            const rawResult = await executeTool(tc.function.name, parsedArgs);
            const toolResult =
              rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)
                ? rawResult
                : { result: rawResult };

            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(toolResult),
            });
          }
          attempts++;
        } else {
          return choice.content || "";
        }
      }
      throw new Error("Too many tool call iterations.");
    } catch (err: any) {
      console.warn(`[groq-fallback] Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Groq models failed.");
}

export async function executeGroqJson(prompt: string, systemInstruction?: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  let lastError: any;
  for (const model of GROQ_JSON_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Groq API responded with status ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response received from Groq");
      }

      let cleanContent = content.trim();
      const firstBrace = cleanContent.indexOf("{");
      const lastBrace = cleanContent.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanContent = cleanContent.slice(firstBrace, lastBrace + 1);
      }

      return JSON.parse(cleanContent);
    } catch (err: any) {
      console.warn(`[groq-json] Model ${model} failed:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Groq JSON models failed.");
}
