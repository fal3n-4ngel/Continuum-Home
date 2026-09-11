import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/utils";
import { ApiError } from "@/lib/utils";
import {
  convertHistoryToGroqMessages,
  executeGroqChatWithTools,
  sanitizeAiErrorMessage,
  postDiscordEmbed,
  codeBlock,
  DISCORD_RED,
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

const GROQ_TOOLS = [
  {
    type: "function",
    function: {
      name: "listExpenses",
      description: "Retrieve list of expenses. Supports query search, category filtering, and date range checks.",
      parameters: {
        type: "object",
        properties: {
          q: { type: "string", description: "Free text search query" },
          category: { type: "string", description: "Exact category filter" },
          from: { type: "string", description: "Start date (YYYY-MM-DD)" },
          to: { type: "string", description: "End date (YYYY-MM-DD)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createExpense",
      description: "Record a new expense transaction. Date defaults to today if omitted.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short description of expense" },
          amount: { type: "number", description: "Spent amount in INR" },
          category: { type: "string", description: "Category, e.g. Food, Transport, Rent" },
          date: { type: "string", description: "YYYY-MM-DD format" },
          notes: { type: "string", description: "Additional details" },
        },
        required: ["title", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteExpense",
      description: "Remove an expense transaction by its ID.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique expense record ID" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listWatchlistItems",
      description: "Retrieve all movies, TV shows, anime, and books in the user's library.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addWatchlistItem",
      description: "Add a media item (movie, show, anime, or book) to the watchlist.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the media" },
          type: { type: "string", description: "Type of media (movie, show, anime, book)" },
          status: { type: "string", description: "Status (plan_to_watch, watching, paused, completed, dropped). Default is 'plan_to_watch'" },
          progress: { type: "integer", description: "Current episode or page progress" },
          totalEpisodes: { type: "integer", description: "Total episodes/pages if known" },
          rating: { type: "number", description: "User rating out of 10" },
        },
        required: ["title", "type", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateWatchlistItem",
      description: "Update fields of an item in the watchlist.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Item ID" },
          status: { type: "string", description: "Status (plan_to_watch, watching, paused, completed, dropped)" },
          progress: { type: "integer" },
          rating: { type: "number", description: "Rating out of 10" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listSubscriptions",
      description: "Retrieve all recurring subscription records.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPortfolio",
      description: "Retrieve all assets in the user's investment portfolio.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
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
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "Server AI service is not configured." }, { status: 500 });
    }

    const uid = session.uid;
    const globalKey = "rate:ai:global:minute";
    const userKey = `rate:ai:user:${uid}:minute`;

    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, 60);
    if (globalCount > 25) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a few seconds." },
        { status: 429 }
      );
    }

    const userCount = await redis.incr(userKey);
    if (userCount === 1) await redis.expire(userKey, 60);
    if (userCount > 8) {
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

    try {
      const groqMessages = convertHistoryToGroqMessages(trimmedHistory, message, SYSTEM_INSTRUCTION);

      replyText = await executeGroqChatWithTools({
        messages: groqMessages,
        tools: GROQ_TOOLS,
        executeTool: (name, args) => executeTool(session, name, args),
      });

      const baseHistory = Array.isArray(history) ? [...history] : [];
      updatedHistory = [
        ...baseHistory,
        { role: "user", parts: [{ text: message }] },
        { role: "assistant", parts: [{ text: replyText }] },
      ];
    } catch (groqError: any) {
      const groqErrorMsg = groqError?.message || String(groqError);
      console.error("[Kiroku] Groq chat failed:", groqErrorMsg);
      postDiscordEmbed({
        title: "🚨 Assistant AI Outage: Groq Failed",
        description: "Groq model failed to complete the user's assistant request.",
        color: DISCORD_RED,
        fields: [
          { name: "Groq Error Reason", value: codeBlock(groqErrorMsg) },
          { name: "User", value: session.user.email || session.uid, inline: true },
          { name: "Query", value: message.slice(0, 200), inline: true },
        ],
        footer: { text: "Continuum Assistant • Critical Error" },
      }).catch(() => {});

      const sanitized = sanitizeAiErrorMessage(groqError);
      return NextResponse.json({ error: sanitized }, { status: 503 });
    }

    return NextResponse.json({
      reply: replyText,
      history: updatedHistory,
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
