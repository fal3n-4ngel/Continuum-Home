import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/utils";
import { ApiError } from "@/lib/utils";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import {
  convertGeminiToolsToGroq,
  convertHistoryToGroqMessages,
  executeGroqChatWithTools,
  sanitizeAiErrorMessage,
  postDiscordEmbed,
  codeBlock,
  DISCORD_RED,
  DISCORD_ORANGE,
} from "@/lib/integrations";
import {
  listExpenses,
  createExpense,
  archiveExpense,
  listWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  listSubscriptions,
  getPortfolio,
  getNote,
  updateNote,
  getSettings,
} from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

const SYSTEM_INSTRUCTION = `Your name is Kiroku, a strict, focused, domain-specific AI Assistant built into the Continuum Home app.
Your only purpose is to help users manage their personal dashboard data.

You can help with:
1. Expenses (logging new expenses, listing transactions, checking monthly summaries).
2. Watchlist (adding movies/shows/anime/books, updating episode progress, completed ratings, listing watchlist).
3. Subscriptions (listing monthly/yearly costs).
4. Portfolio (checking net asset value, list of investment assets).
5. Scratchpad Notes (getting or updating notes).

CRITICAL GUARDRAIL:
- You are allowed (and expected) to analyze the user's data to answer analysis/recommendation questions directly related to their dashboard (e.g. recommending movies/shows based on their watchlist history, analyzing expense patterns, suggesting budget adjustments, summarizing their notes).
- If the user asks completely off-topic questions (e.g. general science, history, coding/programming, writing essays, math puzzles, general internet search, general-purpose chat/assistance), you MUST refuse to answer.
- When refusing off-topic queries, reply exactly with: "I can only assist you with managing your expenses, watchlist, subscriptions, portfolio, or scratchpad notes on this dashboard."
- Never break this rule.
- If asked what model, AI, or provider you're built on, simply say you're Kiroku, Continuum Home's built-in assistant — never name the underlying model or vendor.`;

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "listExpenses",
    description: "Retrieve list of expenses. Supports query search, category filtering, and date range checks.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        q: { type: SchemaType.STRING, description: "Free text search query" },
        category: { type: SchemaType.STRING, description: "Exact category filter" },
        from: { type: SchemaType.STRING, description: "Start date (YYYY-MM-DD)" },
        to: { type: SchemaType.STRING, description: "End date (YYYY-MM-DD)" }
      }
    }
  },
  {
    name: "createExpense",
    description: "Record a new expense transaction. Date defaults to today if omitted.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Short description of expense" },
        amount: { type: SchemaType.NUMBER, description: "Spent amount in INR" },
        category: { type: SchemaType.STRING, description: "Category, e.g. Food, Transport, Rent" },
        date: { type: SchemaType.STRING, description: "YYYY-MM-DD format" },
        notes: { type: SchemaType.STRING, description: "Additional details" }
      },
      required: ["title", "amount"]
    }
  },
  {
    name: "deleteExpense",
    description: "Remove an expense transaction by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Unique expense record ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "listWatchlistItems",
    description: "Retrieve all movies, TV shows, anime, and books in the user's library.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "addWatchlistItem",
    description: "Add a media item (movie, show, anime, or book) to the watchlist.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Title of the media" },
        type: { type: SchemaType.STRING, description: "Type of media (movie, show, anime, book)" },
        status: { type: SchemaType.STRING, description: "Status (plan_to_watch, watching, paused, completed, dropped). Default is 'plan_to_watch'" },
        progress: { type: SchemaType.INTEGER, description: "Current episode or page progress" },
        totalEpisodes: { type: SchemaType.INTEGER, description: "Total episodes/pages if known" },
        rating: { type: SchemaType.NUMBER, description: "User rating out of 10" }
      },
      required: ["title", "type", "status"]
    }
  },
  {
    name: "updateWatchlistItem",
    description: "Update fields of an item in the watchlist.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Item ID" },
        status: { type: SchemaType.STRING, description: "Status (plan_to_watch, watching, paused, completed, dropped)" },
        progress: { type: SchemaType.INTEGER },
        rating: { type: SchemaType.NUMBER, description: "Rating out of 10" }
      },
      required: ["id"]
    }
  },
  {
    name: "listSubscriptions",
    description: "Retrieve all recurring subscription records.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getPortfolio",
    description: "Retrieve all assets in the user's investment portfolio.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getNote",
    description: "Fetch the contents of the auto-saving scratchpad note.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "updateNote",
    description: "Overwrite the entire content of the scratchpad note.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: { type: SchemaType.STRING, description: "New markdown/text note content" }
      },
      required: ["content"]
    }
  }
];

function recordAgentEvent(
  session: any,
  eventType: any,
  entityId?: string,
  payload?: Record<string, unknown>
) {
  recordDomainEvent({
    eventType,
    userId: session.uid,
    userEmail: session.user.email,
    entityId,
    payload: {
      channel: "kirko_agent",
      ...payload,
    },
  });
}

async function executeTool(session: any, name: string, args: any) {
  try {
    switch (name) {
      case "listExpenses": {
        const raw = await listExpenses(session, args);
        const totalCount = raw.length;
        const totalAmount = raw.reduce((sum, r) => sum + (r.amount || 0), 0);
        const items = raw.slice(0, 35).map((r) => ({
          id: r.id,
          title: r.title,
          amount: r.amount,
          category: r.category,
          date: r.date,
          notes: r.notes || undefined,
        }));
        return {
          totalCount,
          totalAmount,
          returnedCount: items.length,
          expenses: items,
        };
      }
      case "createExpense": {
        const result = await createExpense(session, args);
        if (result?.id) {
          recordAgentEvent(session, DOMAIN_EVENTS.EXPENSE_CREATED, result.id, {
            title: args.title,
            amount: args.amount,
            category: args.category,
            date: args.date,
          });
        }
        return result;
      }
      case "deleteExpense": {
        const result = await archiveExpense(session, args.id);
        recordAgentEvent(session, DOMAIN_EVENTS.EXPENSE_DELETED, args.id);
        return result;
      }
      case "listWatchlistItems": {
        const raw = await listWatchlist(session);
        const totalCount = raw.length;
        const items = raw.slice(0, 40).map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          progress: i.progress,
          totalEpisodes: i.totalEpisodes,
          rating: i.rating,
        }));
        return {
          totalCount,
          returnedCount: items.length,
          watchlist: items,
        };
      }
      case "addWatchlistItem": {
        const result = await addWatchlistItem(session, args);
        if (result?.id) {
          recordAgentEvent(session, DOMAIN_EVENTS.WATCHLIST_ADDED, result.id, {
            title: args.title,
            type: args.type,
            status: args.status,
          });
        }
        return result;
      }
      case "updateWatchlistItem": {
        const result = await updateWatchlistItem(session, args.id, args);
        recordAgentEvent(session, DOMAIN_EVENTS.WATCHLIST_UPDATED, args.id);
        return result;
      }
      case "listSubscriptions": {
        const raw = await listSubscriptions(session);
        const totalMonthly = raw.reduce((sum, s) => {
          const cost = s.cost || 0;
          return sum + (s.billingCycle === "yearly" ? cost / 12 : cost);
        }, 0);
        const items = raw.map((s) => ({
          id: s.id,
          name: s.name,
          cost: s.cost,
          billingCycle: s.billingCycle,
          nextBillingDate: s.nextBillingDate,
        }));
        return {
          totalCount: raw.length,
          approxMonthlyTotal: Math.round(totalMonthly),
          subscriptions: items,
        };
      }
      case "getPortfolio": {
        const raw = await getPortfolio(session);
        if (Array.isArray(raw)) {
          const totalValue = raw.reduce((sum, a) => sum + ((a.quantity || 0) * (a.currentPrice || a.avgBuyPrice || 0)), 0);
          const items = raw.slice(0, 30).map((a) => ({
            id: a.id,
            name: a.name,
            symbol: a.symbol,
            type: a.type,
            quantity: a.quantity,
            avgBuyPrice: a.avgBuyPrice,
            currentPrice: a.currentPrice,
          }));
          return {
            totalAssetCount: raw.length,
            approxTotalValue: Math.round(totalValue),
            assets: items,
          };
        }
        return raw;
      }
      case "getNote": {
        const note = await getNote(session);
        const content = note?.content || "";
        return { content: content.length > 2000 ? `${content.slice(0, 2000)}... (truncated)` : content };
      }
      case "updateNote":
        return await updateNote(session, args.content);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { error: err.message || "Failed to execute database action" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    const settings = await getSettings(session).catch(() => null);
    if (settings?.aiOptOut) {
      return NextResponse.json(
        { error: "AI features have been disabled in your account privacy settings." },
        { status: 403 }
      );
    }

    if (!redis) {
      return NextResponse.json({ error: "Rate limit cache offline." }, { status: 500 });
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!geminiApiKey && !groqApiKey) {
      return NextResponse.json({ error: "Server AI service is not configured." }, { status: 500 });
    }

    const uid = session.uid;
    const globalKey = "rate:gemini:global:minute";
    const userKey = `rate:gemini:user:${uid}:minute`;

    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, 60);
    if (globalCount > 15) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a few seconds." },
        { status: 429 }
      );
    }

    const userCount = await redis.incr(userKey);
    if (userCount === 1) await redis.expire(userKey, 60);
    if (userCount > 5) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message query." }, { status: 400 });
    }

    const MAX_HISTORY_TURNS = 10;
    const rawHistory = Array.isArray(history) ? history : [];
    const trimmedHistory = rawHistory.slice(-MAX_HISTORY_TURNS);

    let replyText: string | null = null;
    let updatedHistory: any[] = [];
    let lastError: any = null;

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations }]
        });

        const sdkHistory = trimmedHistory.map((h: any) => ({
          role: h.role,
          parts: h.parts
        }));

        const chat = model.startChat({
          history: sdkHistory
        });

        let response = await chat.sendMessage(message);
        let attempts = 0;

        while (attempts < 5) {
          const functionCalls = response.response.functionCalls();
          if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const rawResult = await executeTool(session, call.name, call.args);
            const toolResult = (rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)) ? rawResult : { result: rawResult };

            response = await chat.sendMessage([{
              functionResponse: {
                name: call.name,
                response: toolResult
              }
            }]);

            attempts++;
          } else {
            replyText = response.response.text();
            updatedHistory = await chat.getHistory();
            break;
          }
        }
      } catch (geminiError: any) {
        lastError = geminiError;
        const geminiErrorMsg = geminiError?.message || String(geminiError);
        console.warn("[Kiroku] Gemini call failed, attempting Groq fallback:", geminiErrorMsg);
        postDiscordEmbed({
          title: "⚠️ Gemini Assistant Request Failed",
          description: "Gemini encountered an error. Attempting fallback to Groq.",
          color: DISCORD_ORANGE,
          fields: [
            { name: "Error Reason", value: codeBlock(geminiErrorMsg) },
            { name: "User", value: session.user.email || session.uid, inline: true },
            { name: "Query", value: message.slice(0, 200), inline: true },
          ],
          footer: { text: "Continuum Assistant • Gemini Fallback" },
        }).catch(() => {});
      }
    }

    if (!replyText && groqApiKey) {
      try {
        const groqTools = convertGeminiToolsToGroq(functionDeclarations);
        const groqMessages = convertHistoryToGroqMessages(trimmedHistory, message, SYSTEM_INSTRUCTION);

        replyText = await executeGroqChatWithTools({
          messages: groqMessages,
          tools: groqTools,
          executeTool: (name, args) => executeTool(session, name, args),
        });

        const baseHistory = Array.isArray(history) ? [...history] : [];
        updatedHistory = [
          ...baseHistory,
          { role: "user", parts: [{ text: message }] },
          { role: "model", parts: [{ text: replyText }] },
        ];
      } catch (groqError: any) {
        lastError = groqError;
        const groqErrorMsg = groqError?.message || String(groqError);
        console.error("[Kiroku] Groq fallback also failed:", groqErrorMsg);
        postDiscordEmbed({
          title: "🚨 Assistant AI Outage: Gemini & Groq Failed",
          description: "Both Gemini and Groq models failed to complete the user's assistant request.",
          color: DISCORD_RED,
          fields: [
            { name: "Groq Error Reason", value: codeBlock(groqErrorMsg) },
            { name: "User", value: session.user.email || session.uid, inline: true },
            { name: "Query", value: message.slice(0, 200), inline: true },
          ],
          footer: { text: "Continuum Assistant • Critical Error" },
        }).catch(() => {});
      }
    }

    if (!replyText) {
      const sanitized = sanitizeAiErrorMessage(lastError);
      return NextResponse.json({ error: sanitized }, { status: 503 });
    }

    return NextResponse.json({
      reply: replyText,
      history: updatedHistory
    });
  } catch (error: any) {
    console.error("Assistant Chat Error:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const unhandledMsg = error?.message || String(error);
    postDiscordEmbed({
      title: "🚨 Assistant Chat Unhandled Error",
      color: DISCORD_RED,
      fields: [
        { name: "Error Reason", value: codeBlock(unhandledMsg) },
      ],
      footer: { text: "Continuum Assistant • Global Catch" },
    }).catch(() => {});
    return NextResponse.json({ error: sanitizeAiErrorMessage(error) }, { status: 500 });
  }
}
