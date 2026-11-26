import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listExpenses,
  createExpense,
  archiveExpense,
  getExpense,
  listWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  listSubscriptions,
  createSubscription,
  getPortfolio,
  getSettings,
} from "@/lib/firebase";
import { recordDomainEvent, DOMAIN_EVENTS } from "@/lib/domain-events";

export const dynamic = "force-dynamic";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id",
};

function getOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  try {
    return new URL(req.url).origin;
  } catch {
    return process.env.APP_URL || "https://continuum-home.vercel.app";
  }
}

function unauthorizedResponse(origin: string, message = "Authentication required", isInvalidToken = false, id: any = null) {
  const metadataUrl = `${origin}/.well-known/oauth-protected-resource`;
  const challenge = isInvalidToken
    ? `Bearer error="invalid_token", error_description="${message}", resource_metadata="${metadataUrl}"`
    : `Bearer resource_metadata="${metadataUrl}", error_description="${message}"`;
  return new NextResponse(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: `${message}. Please connect your Continuum Home account via OAuth to perform this action: ${origin}/api/oauth/authorize`,
          },
        ],
        _meta: {
          "mcp/www_authenticate": [challenge],
        },
      },
      error: {
        code: -32001,
        message,
        data: {
          _meta: {
            "mcp/www_authenticate": [challenge],
          },
        },
      },
      _meta: {
        "mcp/www_authenticate": [challenge],
      },
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": challenge,
        Link: `<${metadataUrl}>; rel="oauth-protected-resource"`,
        ...CORS_HEADERS,
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

const TOOLS_MANIFEST = [
  {
    name: "connect_account",
    title: "Connect Account",
    description: "Verify authentication or connect your Continuum Home account to access expenses, watchlists, portfolio, and settings. Call this whenever the user needs to sign in or connect.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "get_auth_status",
    title: "Get Auth Status",
    description: "Check if the current session is connected to a verified Continuum Home user account.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "list_expenses",
    title: "List Expenses",
    description: "List expenses and income with optional search, category, tag, type, amount, date range, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query matching title, notes, or tags" },
        category: { type: "string", description: "Expense category filter" },
        tag: { type: "string", description: "Tag filter" },
        type: { type: "string", enum: ["expense", "income"], description: "Entry type filter" },
        from: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to: { type: "string", description: "End date in YYYY-MM-DD format" },
        minAmount: { type: "number", description: "Minimum amount filter" },
        maxAmount: { type: "number", description: "Maximum amount filter" },
        limit: { type: "integer", description: "Page size (1-200, default 50)" },
        offset: { type: "integer", description: "Number of items to skip (default 0)" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "create_expense",
    title: "Create Expense",
    description: "Add a new expense to the personal ledger.",
    inputSchema: {
      type: "object",
      required: ["title", "amount", "category"],
      properties: {
        title: { type: "string", description: "Expense name or description" },
        amount: { type: "number", description: "Expense amount" },
        category: { type: "string", description: "Category (e.g. Food, Groceries, Rent, Utilities, Transport)" },
        date: { type: "string", description: "Date of expense in YYYY-MM-DD format (defaults to today)" },
        notes: { type: "string", description: "Additional notes" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "delete_expense",
    title: "Delete Expense",
    description: "Delete an expense entry by its unique ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Unique ID of the expense to delete" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "list_watchlist",
    title: "List Watchlist",
    description: "List media watchlist items with optional search, type, status, rating filter, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query matching title" },
        type: {
          type: "string",
          enum: ["movie", "show", "anime", "book"],
          description: "Media type filter",
        },
        status: {
          type: "string",
          enum: ["Planned", "In Progress", "Completed", "Dropped", "Paused"],
          description: "Watch status filter",
        },
        minRating: { type: "number", description: "Minimum rating filter (0-10)" },
        limit: { type: "integer", description: "Page size (1-200, default 50)" },
        offset: { type: "integer", description: "Number of items to skip (default 0)" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "add_watchlist_item",
    title: "Add Watchlist Item",
    description: "Add a movie, show, anime, or book to the watchlist.",
    inputSchema: {
      type: "object",
      required: ["title", "type"],
      properties: {
        title: { type: "string", description: "Title of the media" },
        type: {
          type: "string",
          enum: ["movie", "show", "anime", "book"],
          description: "Media type",
        },
        status: {
          type: "string",
          enum: ["Planned", "In Progress", "Completed", "Dropped"],
          description: "Status (defaults to Planned)",
        },
        rating: { type: "number", description: "User rating from 1 to 10" },
        notes: { type: "string", description: "Notes or thoughts" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "update_watchlist_item",
    title: "Update Watchlist Item",
    description: "Update the status, rating, or notes for a watchlist item.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Unique item ID" },
        status: {
          type: "string",
          enum: ["Planned", "In Progress", "Completed", "Dropped"],
          description: "New status",
        },
        rating: { type: "number", description: "Updated rating (1-10)" },
        notes: { type: "string", description: "Updated notes" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "delete_watchlist_item",
    title: "Delete Watchlist Item",
    description: "Delete a watchlist item by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Unique item ID" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "list_subscriptions",
    title: "List Subscriptions",
    description: "List recurring subscriptions and income rules with optional filters and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query matching name or category" },
        billingCycle: { type: "string", enum: ["monthly", "yearly"], description: "Billing cycle filter" },
        type: { type: "string", enum: ["expense", "income"], description: "Rule type filter" },
        autoPost: { type: "boolean", description: "Filter by auto-post enabled status" },
        limit: { type: "integer", description: "Page size (1-200, default 50)" },
        offset: { type: "integer", description: "Number of items to skip (default 0)" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "create_subscription",
    title: "Create Subscription",
    description: "Add a new recurring subscription to track.",
    inputSchema: {
      type: "object",
      required: ["name", "amount", "billingCycle"],
      properties: {
        name: { type: "string", description: "Subscription name" },
        amount: { type: "number", description: "Billing amount" },
        currency: { type: "string", description: "Currency code (default: INR)" },
        billingCycle: {
          type: "string",
          enum: ["monthly", "yearly", "quarterly", "weekly"],
          description: "Billing cycle",
        },
        category: { type: "string", description: "Category (e.g. Entertainment, Software, Cloud)" },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "get_portfolio",
    title: "Get Portfolio",
    description: "Get investment portfolio holdings with optional category, search, sold filter, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query matching asset name or notes" },
        category: {
          type: "string",
          enum: ["equity", "crypto", "mutual_fund", "sip", "gold", "cash", "fixed_deposit", "other"],
          description: "Asset category filter",
        },
        isSold: { type: "boolean", description: "Filter by sold status" },
        includeValuationHistory: { type: "boolean", description: "Include daily valuationHistory map (default false)" },
        limit: { type: "integer", description: "Page size (1-200, default 50)" },
        offset: { type: "integer", description: "Number of assets to skip (default 0)" },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
  {
    name: "get_settings",
    title: "Get Settings",
    description: "Retrieve dashboard configuration, user preferences, and monthly budget limits.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
    securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
    _meta: {
      securitySchemes: [{ type: "noauth" }, { type: "oauth2", scopes: ["read", "write"] }],
      ui: {
        visibility: ["model", "app"],
      },
    },
  },
];

export async function GET(req: NextRequest) {
  const accept = req.headers.get("accept") || "";

  // If the client explicitly requests SSE (for Streamable HTTP notifications / keep-alive)
  if (accept.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Stream an immediate keep-alive comment
    writer.write(encoder.encode(": keep-alive\n\n")).catch(() => {});

    const keepAliveInterval = setInterval(() => {
      writer.write(encoder.encode(": keep-alive\n\n")).catch(() => {
        clearInterval(keepAliveInterval);
      });
    }, 15000);

    req.signal.addEventListener("abort", () => {
      clearInterval(keepAliveInterval);
      writer.close().catch(() => {});
    });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        ...CORS_HEADERS,
      },
    });
  }

  // Standard Streamable HTTP / discovery GET returns tools manifest & server info directly as JSON
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "Continuum Home", version: "2.3.0" },
        instructions: "Continuum Home Personal Finance & Life Dashboard MCP Server. Access personal finances, expenses, watchlists, subscriptions, and portfolio.",
        tools: TOOLS_MANIFEST,
      },
    },
    { headers: CORS_HEADERS }
  );
}

function normalizeWatchStatus(status?: string): "plan_to_watch" | "watching" | "completed" | "dropped" | "paused" {
  if (!status) return "plan_to_watch";
  const s = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (s.includes("progress") || s === "watching") return "watching";
  if (s === "completed" || s === "complete") return "completed";
  if (s === "dropped") return "dropped";
  if (s === "paused") return "paused";
  return "plan_to_watch";
}

function paginate<T>(items: T[], args: Record<string, any>) {
  const rawLimit = Number(args.limit);
  const rawOffset = Number(args.offset);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
  const sliced = items.slice(offset, offset + limit);
  const hasMore = offset + sliced.length < items.length;
  return {
    items: sliced,
    total: items.length,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + sliced.length : null,
  };
}

async function executeTool(session: any, name: string, args: Record<string, any> = {}) {
  switch (name) {
    case "connect_account": {
      return {
        status: "authenticated",
        userId: session.uid || session.id || "verified_user",
        message: "Your Continuum Home account is successfully connected and authorized."
      };
    }
    case "get_auth_status": {
      return {
        authenticated: true,
        userId: session.uid || session.id || "verified_user",
        email: session.email || null,
        message: "Continuum Home is active and ready."
      };
    }
    case "list_expenses": {
      let expenses = await listExpenses(session, {
        q: args.q,
        category: args.category,
        from: args.from,
        to: args.to,
        tag: args.tag,
        type: args.type === "income" || args.type === "expense" ? args.type : undefined,
      });
      if (args.minAmount != null && !isNaN(Number(args.minAmount))) {
        const min = Number(args.minAmount);
        expenses = expenses.filter((e) => (e.amount ?? 0) >= min);
      }
      if (args.maxAmount != null && !isNaN(Number(args.maxAmount))) {
        const max = Number(args.maxAmount);
        expenses = expenses.filter((e) => (e.amount ?? 0) <= max);
      }
      return paginate(expenses, args);
    }
    case "create_expense": {
      const resolvedDate = args.date || new Date().toISOString().slice(0, 10);
      const result = await createExpense(session, {
        title: args.title,
        amount: Number(args.amount),
        category: args.category,
        date: resolvedDate,
        notes: args.notes,
        type: args.type === "income" ? "income" : "expense",
        tags: Array.isArray(args.tags) ? args.tags : undefined,
      });
      if (result?.id) {
        recordDomainEvent({
          eventType: DOMAIN_EVENTS.EXPENSE_CREATED,
          userId: session.uid,
          entityId: result.id,
          userEmail: session.user?.email || session.email || null,
          payload: {
            title: args.title,
            amount: Number(args.amount),
            category: args.category,
            date: resolvedDate,
            notes: args.notes,
            channel: "chatgpt_plugin",
            source: "chatgpt_plugin",
          },
        });
      }
      return result;
    }
    case "delete_expense": {
      const existing = await getExpense(session, args.id);
      await archiveExpense(session, args.id);
      recordDomainEvent({
        eventType: DOMAIN_EVENTS.EXPENSE_DELETED,
        userId: session.uid,
        entityId: args.id,
        userEmail: session.user?.email || session.email || null,
        payload: {
          ...(existing
            ? {
                title: existing.title,
                amount: existing.amount,
                category: existing.category,
                date: existing.date,
              }
            : {}),
          deletedAt: Date.now(),
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        },
      });
      return { success: true, message: `Expense ${args.id} deleted` };
    }
    case "list_watchlist": {
      let items = await listWatchlist(session);
      if (args.q) {
        const qLower = String(args.q).toLowerCase();
        items = items.filter((i) => i.title.toLowerCase().includes(qLower));
      }
      if (args.type) items = items.filter((i) => i.type === args.type);
      if (args.status) {
        const norm = normalizeWatchStatus(args.status);
        items = items.filter((i) => i.status === norm);
      }
      if (args.minRating != null && !isNaN(Number(args.minRating))) {
        const minR = Number(args.minRating);
        items = items.filter((i) => (i.rating ?? 0) >= minR);
      }
      return paginate(items, args);
    }
    case "add_watchlist_item": {
      const itemData = {
        title: args.title,
        type: args.type,
        status: normalizeWatchStatus(args.status),
        rating: args.rating != null ? Number(args.rating) : null,
        progress: Number(args.progress || 0),
        totalEpisodes: args.totalEpisodes != null ? Number(args.totalEpisodes) : null,
        coverImage: args.coverImage || null,
        year: args.year != null ? Number(args.year) : null,
      };
      const result = await addWatchlistItem(session, itemData);
      if (result?.id) {
        recordDomainEvent({
          eventType: DOMAIN_EVENTS.WATCHLIST_ADDED,
          userId: session.uid,
          entityId: result.id,
          userEmail: session.user?.email || session.email || null,
          payload: {
            title: itemData.title,
            type: itemData.type,
            status: itemData.status,
            year: itemData.year,
            channel: "chatgpt_plugin",
            source: "chatgpt_plugin",
          },
        });
      }
      return result;
    }
    case "update_watchlist_item": {
      const updates: any = {};
      if (args.status) updates.status = normalizeWatchStatus(args.status);
      if (args.rating != null) updates.rating = Number(args.rating);
      if (args.progress != null) updates.progress = Number(args.progress);
      const result = await updateWatchlistItem(session, args.id, updates);
      recordDomainEvent({
        eventType: DOMAIN_EVENTS.WATCHLIST_UPDATED,
        userId: session.uid,
        entityId: args.id,
        userEmail: session.user?.email || session.email || null,
        payload: {
          ...updates,
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        },
      });
      return result;
    }
    case "delete_watchlist_item": {
      await deleteWatchlistItem(session, args.id);
      recordDomainEvent({
        eventType: DOMAIN_EVENTS.WATCHLIST_REMOVED,
        userId: session.uid,
        entityId: args.id,
        userEmail: session.user?.email || session.email || null,
        payload: {
          deletedAt: Date.now(),
          channel: "chatgpt_plugin",
          source: "chatgpt_plugin",
        },
      });
      return { success: true, message: `Watchlist item ${args.id} deleted` };
    }
    case "list_subscriptions": {
      let subs = await listSubscriptions(session);
      if (args.q) {
        const qLower = String(args.q).toLowerCase();
        subs = subs.filter(
          (s) =>
            s.name.toLowerCase().includes(qLower) ||
            (s.category && s.category.toLowerCase().includes(qLower))
        );
      }
      if (args.billingCycle) {
        subs = subs.filter((s) => s.billingCycle === args.billingCycle);
      }
      if (args.type) {
        subs = subs.filter((s) => (s.type ?? "expense") === args.type);
      }
      if (typeof args.autoPost === "boolean") {
        subs = subs.filter((s) => Boolean(s.autoPost) === args.autoPost);
      }
      return paginate(subs, args);
    }
    case "create_subscription": {
      const subData = {
        name: args.name,
        cost: Number(args.cost ?? args.amount),
        billingCycle: (args.billingCycle === "yearly" ? "yearly" : "monthly") as "yearly" | "monthly",
        nextBillingDate: args.nextBillingDate || new Date().toISOString().slice(0, 10),
        icon: args.icon || null,
        type: (args.type === "income" ? "income" : "expense") as "income" | "expense",
        autoPost: Boolean(args.autoPost),
        category: args.category || null,
      };
      const result = await createSubscription(session, subData);
      if (result?.id) {
        recordDomainEvent({
          eventType: DOMAIN_EVENTS.SUBSCRIPTION_CREATED,
          userId: session.uid,
          entityId: result.id,
          userEmail: session.user?.email || session.email || null,
          payload: {
            name: subData.name,
            cost: subData.cost,
            amount: subData.cost,
            billingCycle: subData.billingCycle,
            nextBillingDate: subData.nextBillingDate,
            channel: "chatgpt_plugin",
            source: "chatgpt_plugin",
          },
        });
      }
      return result;
    }
    case "get_portfolio": {
      const portfolio = await getPortfolio(session);
      if (!portfolio) return null;
      let assets = [...portfolio.assets];
      if (args.q) {
        const qLower = String(args.q).toLowerCase();
        assets = assets.filter(
          (a) =>
            a.name.toLowerCase().includes(qLower) ||
            (a.notes && a.notes.toLowerCase().includes(qLower))
        );
      }
      if (args.category) {
        assets = assets.filter((a) => a.category === args.category);
      }
      if (typeof args.isSold === "boolean") {
        assets = assets.filter((a) => Boolean(a.isSold) === args.isSold);
      }
      const paged = paginate(assets, args);
      return {
        id: portfolio.id,
        updatedAt: portfolio.updatedAt,
        assets: paged.items,
        total: paged.total,
        limit: paged.limit,
        offset: paged.offset,
        hasMore: paged.hasMore,
        nextOffset: paged.nextOffset,
        ...(args.includeValuationHistory ? { valuationHistory: portfolio.valuationHistory } : {}),
      };
    }
    case "get_settings": {
      return await getSettings(session);
    }
    default:
      throw new Error(`Tool "${name}" not recognized.`);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authHeader = req.headers.get("authorization");

  let session: any = null;
  let authError: NextResponse | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      session = await requireUser(req);
    } catch {
      authError = unauthorizedResponse(origin, "Invalid or expired token", true);
    }
  } else {
    authError = unauthorizedResponse(origin, "Authentication required", false);
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    rawBody = "";
  }

  // Handle empty POST probes gracefully
  if (!rawBody || !rawBody.trim()) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "Continuum Home", version: "2.3.0" },
          capabilities: { tools: { listChanged: false } },
          tools: TOOLS_MANIFEST,
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    // If not JSON, return tools manifest rather than a 400 error that breaks OpenAI App discovery
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "Continuum Home", version: "2.3.0" },
          capabilities: { tools: { listChanged: false } },
          tools: TOOLS_MANIFEST,
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("sessionId");

  async function handleSingleMessage(msg: any): Promise<any> {
    const id = msg?.id ?? null;
    const method = msg?.method;

    if (!method) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS_MANIFEST,
        },
      };
    }

    if (method === "notifications/initialized") {
      return null;
    }

    if (method === "ping") {
      return { jsonrpc: "2.0", id, result: {} };
    }

    if (method === "initialize") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: "Continuum Home",
            version: "2.3.0",
          },
          instructions: "Continuum Home Personal Finance & Life Dashboard MCP Server. Access personal finances, expenses, watchlists, subscriptions, and portfolio.",
        },
      };
    }

    if (method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS_MANIFEST,
        },
      };
    }

    if (method === "tools/call") {
      const toolName = msg?.params?.name;
      const toolArgs = msg?.params?.arguments || {};

      // connect_account and get_auth_status are always callable even before OAuth
      if (toolName === "connect_account") {
        if (!session) {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Please sign in to connect your Continuum Home account: ${origin}/api/oauth/authorize`,
                },
              ],
            },
          };
        }
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: "Your Continuum Home account is successfully connected and authorized.",
              },
            ],
          },
        };
      }

      if (toolName === "get_auth_status") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  authenticated: !!session,
                  userId: session?.uid || session?.id || null,
                  email: session?.email || null,
                  message: session ? "Connected to Continuum Home." : "Not connected. Sign in via OAuth to access data.",
                }),
              },
            ],
          },
        };
      }

      if (!session) {
        // Signal authentication requirement using RFC 9728 standard challenge and mcp/www_authenticate
        return {
          _isAuthError: true,
          errorResponse: unauthorizedResponse(origin, "Authentication required", false, id)
        };
      }
      try {
        const result = await executeTool(session, toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      } catch (err: any) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error executing tool "${toolName}": ${err.message || String(err)}`,
              },
            ],
          },
        };
      }
    }

    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  }

  let response: any;
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(handleSingleMessage))).filter(Boolean);
    const authFail = responses.find((r) => r?._isAuthError);
    if (authFail) {
      return authFail.errorResponse;
    }
    response = responses;
  } else {
    response = await handleSingleMessage(body);
    if (response?._isAuthError) {
      return response.errorResponse;
    }
  }

  const mcpSessionId = req.headers.get("mcp-session-id") || sessionId || crypto.randomUUID();
  const headers = {
    ...CORS_HEADERS,
    "Mcp-Session-Id": mcpSessionId,
  };

  if (response === null) {
    return new NextResponse(null, { status: 204, headers });
  }

  return NextResponse.json(response, { headers });
}
