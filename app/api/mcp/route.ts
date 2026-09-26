import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  listExpenses,
  createExpense,
  archiveExpense,
  listWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  listSubscriptions,
  createSubscription,
  getPortfolio,
  getSettings,
} from "@/lib/firebase";

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
            text: `${message}. Please connect your Continuum Home account via OAuth.`,
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

// Global registry of active SSE streams for classic MCP SSE transport
const activeSseClients = new Map<string, (chunk: string) => void>();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

const TOOLS_MANIFEST = [
  {
    name: "connect_account",
    description: "Verify authentication or connect your Continuum Home account to access expenses, watchlists, portfolio, and settings. Always call this if the user needs to sign in or connect.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "noauth" }],
  },
  {
    name: "get_auth_status",
    description: "Check if the current session is connected to a verified Continuum Home user account.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "noauth" }],
  },
  {
    name: "list_expenses",
    description: "List recent expenses with optional search term, category, and date range filters.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query matching title or notes" },
        category: { type: "string", description: "Expense category filter" },
        from: { type: "string", description: "Start date in YYYY-MM-DD format" },
        to: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "create_expense",
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
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "delete_expense",
    description: "Delete an expense entry by its unique ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Unique ID of the expense to delete" },
      },
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "list_watchlist",
    description: "List media watchlist items (movies, TV shows, anime, and books).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["movie", "show", "anime", "book"],
          description: "Media type filter",
        },
        status: {
          type: "string",
          enum: ["Planned", "In Progress", "Completed", "Dropped"],
          description: "Watch status filter",
        },
      },
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "add_watchlist_item",
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
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "update_watchlist_item",
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
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "delete_watchlist_item",
    description: "Delete a watchlist item by ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Unique item ID" },
      },
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "list_subscriptions",
    description: "List all active recurring subscriptions and billing cycles.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "create_subscription",
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
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "get_portfolio",
    description: "Get investment portfolio holdings, asset allocation, and performance summary.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
  {
    name: "get_settings",
    description: "Retrieve dashboard configuration, user preferences, and monthly budget limits.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    _meta: {
      ui: {
        visibility: ["model", "app"],
      },
    },
    securitySchemes: [{ type: "oauth2", scopes: ["read", "write"] }],
  },
];

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const accept = req.headers.get("accept") || "";

  // If the client does not explicitly request SSE, return tools manifest & server info as JSON
  if (!accept.includes("text/event-stream")) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "Continuum Home", version: "2.3.0" },
          tools: TOOLS_MANIFEST,
        },
      },
      { headers: CORS_HEADERS }
    );
  }

  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("sessionId") || crypto.randomUUID();

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = (event: string, data: string) => {
    writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)).catch(() => {});
  };

  activeSseClients.set(sessionId, (payload: string) => {
    sendEvent("message", payload);
  });

  // Emit initial endpoint event directing the client where to post messages
  const endpointUrl = `${origin}/api/mcp?sessionId=${sessionId}`;
  sendEvent("endpoint", endpointUrl);

  // Keep-alive timer
  const keepAliveInterval = setInterval(() => {
    writer.write(encoder.encode(": keep-alive\n\n")).catch(() => {
      clearInterval(keepAliveInterval);
      activeSseClients.delete(sessionId);
    });
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAliveInterval);
    activeSseClients.delete(sessionId);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Mcp-Session-Id": sessionId,
      ...CORS_HEADERS,
    },
  });
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
      return await listExpenses(session, {
        q: args.q,
        category: args.category,
        from: args.from,
        to: args.to,
      });
    }
    case "create_expense": {
      return await createExpense(session, {
        title: args.title,
        amount: Number(args.amount),
        category: args.category,
        date: args.date,
        notes: args.notes,
      });
    }
    case "delete_expense": {
      await archiveExpense(session, args.id);
      return { success: true, message: `Expense ${args.id} deleted` };
    }
    case "list_watchlist": {
      let items = await listWatchlist(session);
      if (args.type) items = items.filter((i) => i.type === args.type);
      if (args.status) {
        const norm = normalizeWatchStatus(args.status);
        items = items.filter((i) => i.status === norm);
      }
      return items;
    }
    case "add_watchlist_item": {
      return await addWatchlistItem(session, {
        title: args.title,
        type: args.type,
        status: normalizeWatchStatus(args.status),
        rating: args.rating != null ? Number(args.rating) : null,
        progress: Number(args.progress || 0),
        totalEpisodes: args.totalEpisodes != null ? Number(args.totalEpisodes) : null,
        coverImage: args.coverImage || null,
        year: args.year != null ? Number(args.year) : null,
      });
    }
    case "update_watchlist_item": {
      const updates: any = {};
      if (args.status) updates.status = normalizeWatchStatus(args.status);
      if (args.rating != null) updates.rating = Number(args.rating);
      if (args.progress != null) updates.progress = Number(args.progress);
      return await updateWatchlistItem(session, args.id, updates);
    }
    case "delete_watchlist_item": {
      await deleteWatchlistItem(session, args.id);
      return { success: true, message: `Watchlist item ${args.id} deleted` };
    }
    case "list_subscriptions": {
      return await listSubscriptions(session);
    }
    case "create_subscription": {
      return await createSubscription(session, {
        name: args.name,
        cost: Number(args.cost ?? args.amount),
        billingCycle: args.billingCycle === "yearly" ? "yearly" : "monthly",
        nextBillingDate: args.nextBillingDate || new Date().toISOString().slice(0, 10),
        icon: args.icon || null,
      });
    }
    case "get_portfolio": {
      return await getPortfolio(session);
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

  // If classic SSE client is connected on this sessionId, emit message event
  if (sessionId && activeSseClients.has(sessionId) && response) {
    activeSseClients.get(sessionId)!(JSON.stringify(response));
  }

  if (response === null) {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  return NextResponse.json(response, { headers: CORS_HEADERS });
}
