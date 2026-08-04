import { NextRequest, NextResponse } from "next/server";
import { listAllUsers, adminListWatchlist, adminSaveDailyRecommendation, type AdminUser } from "@/lib/firebase-admin";
import type { DailyRecommendation } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron-guard";

export const dynamic = "force-dynamic";
// Gemini free-tier throttling (13s between calls, see GEMINI_MIN_INTERVAL_MS
// below) means this route now runs for roughly (users × 4 types × 13s).
// Bump this if you add users and the cron starts timing out — and note
// Vercel's plan-level cap on function duration still applies on top of this
// (e.g. Hobby plans cap lower than Pro regardless of this value).
export const maxDuration = 300;

// Calculate calendar date in IST (UTC+5:30)
function getCalendarIstDate() {
  const nowUtc = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc.getTime() + istOffset);
  const yyyy = nowIst.getUTCFullYear();
  const mm = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowIst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type ProcessResult = { sent: false; reason: string } | { sent: true; generated: number };

const TYPES: ("movie" | "show" | "anime" | "book")[] = ["movie", "show", "anime", "book"];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The free Gemini tier caps gemini-2.5-flash at 5 requests/minute PER
// PROJECT (not per user), so this has to throttle across the whole cron
// run, not just within one user. lastGeminiCallAt is module-scoped rather
// than per-user so every generateContent() call anywhere in this
// invocation shares the same clock. 13s spacing keeps 60/13 ≈ 4.6 req/min,
// just under the 5/min ceiling.
const GEMINI_MIN_INTERVAL_MS = 13_000;
let lastGeminiCallAt = 0;

// Pulls the server-suggested wait out of a Gemini 429's RetryInfo detail,
// e.g. { retryDelay: "48s" }. Returns null if the error isn't a parseable
// quota error, in which case the caller shouldn't bother retrying.
function extractRetryDelayMs(err: any): number | null {
  const details = err?.errorDetails;
  if (!Array.isArray(details)) return null;
  const retryInfo = details.find((d) => d?.["@type"]?.includes("RetryInfo"));
  const raw = retryInfo?.retryDelay;
  if (typeof raw !== "string") return null;
  const seconds = parseFloat(raw.replace(/s$/, ""));
  return isNaN(seconds) ? null : Math.ceil(seconds * 1000);
}

async function generateThrottled(model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>, prompt: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const elapsed = Date.now() - lastGeminiCallAt;
    if (elapsed < GEMINI_MIN_INTERVAL_MS) {
      await sleep(GEMINI_MIN_INTERVAL_MS - elapsed);
    }
    lastGeminiCallAt = Date.now();
    try {
      const response = await model.generateContent(prompt);
      return response.response.text();
    } catch (err: any) {
      const retryDelayMs = extractRetryDelayMs(err);
      if (attempt === 0 && retryDelayMs !== null) {
        await sleep(retryDelayMs + 500);
        continue;
      }
      throw err;
    }
  }
}

async function processUser(user: AdminUser, geminiApiKey: string, dateStr: string, force: boolean = false): Promise<ProcessResult> {
  if (!force) {
    const alreadySent = await hasCronBeenSentToday("recommendations", user.uid, dateStr);
    if (alreadySent) {
      return { sent: false, reason: "recommendations already generated today (deduplicated)" };
    }
  }

  const allItems = await adminListWatchlist(user.uid);
  if (allItems.length === 0) {
    return { sent: false, reason: "empty watchlist" };
  }
  const existingTitles = allItems.map((item) => item.title.toLowerCase().trim());

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  // Sequential, not Promise.all: concurrent calls would burst 4 requests at
  // once against a 5-req/min quota shared across every user in this run.
  const outcomes: boolean[] = [];
  for (const type of TYPES) {
    outcomes.push(
      await (async () => {
      try {
        let prompt = "";
        if (type === "book") {
          const books = allItems.filter((i) => i.type === "book");
          const readList = books.filter((b) => b.status === "completed").map((b) => b.title).slice(-15);
          const planList = books.filter((b) => b.status === "plan_to_watch").map((b) => b.title).slice(-15);

          prompt = `
You are a premium library assistant. Based on the user's reading lists:
Completed books: ${JSON.stringify(readList)}
Plan to read books: ${JSON.stringify(planList)}

Recommend exactly 1 book they should read next.
DO NOT recommend any book that is already in their library list: ${JSON.stringify(existingTitles)}. This is a strict constraint.
Return ONLY a valid JSON object with the keys:
- "title": Title of the book
- "author": Author name
- "releaseYear": The publication year (as a string)
- "synopsis": A short 2-3 sentence engaging synopsis of the book
- "rationale": A short 1-2 sentence explanation of why they will like it based on their history.

Return no other text or markdown blocks. Just the raw JSON object.
`;
        } else {
          const media = allItems.filter((i) => i.type === type);
          const watched = media
            .filter((m) => m.status === "completed")
            .map((m) => ({ title: m.title, rating: m.rating }))
            .slice(-15);
          const planList = media
            .filter((m) => m.status === "plan_to_watch")
            .map((m) => ({ title: m.title }))
            .slice(-15);

          prompt = `
You are a premium AI media assistant. Based on the user's ${type} list history:
Completed ${type} list: ${JSON.stringify(watched)}
Plan to watch ${type} list: ${JSON.stringify(planList)}

Recommend exactly 1 ${type} they should watch next.
DO NOT recommend any ${type} that is already in their watchlist: ${JSON.stringify(existingTitles)}. This is a strict constraint.
Return ONLY a valid JSON object with the keys:
- "title": Title of the ${type}
- "releaseYear": The release year (as a string)
- "synopsis": A short 2-3 sentence engaging synopsis/plot of the ${type}
- "rationale": A short 1-2 sentence explanation of why they will like it based on their history.

Return no other text or markdown blocks. Just the raw JSON object.
`;
        }

        const replyText = await generateThrottled(model, prompt);
        const geminiResult = JSON.parse(replyText.trim());

        // Enrichment (Quick, single-attempt lookup)
        let coverImage: string | null = null;
        let score: string | null = null;

        if (type === "book") {
          try {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(geminiResult.title)}&limit=1`);
            if (res.ok) {
              const data = await res.json();
              const doc = data.docs?.[0];
              if (doc?.cover_i) {
                coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
              }
            }
          } catch (e) {
            console.error("[Cron Recs] OpenLibrary fetch failed:", e);
          }
        } else {
          const omdbKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
          if (omdbKey) {
            try {
              const res = await fetch(
                `https://www.omdbapi.com/?t=${encodeURIComponent(geminiResult.title)}&y=${geminiResult.releaseYear || ""}&apikey=${omdbKey}`
              );
              if (res.ok) {
                const data = await res.json();
                if (data.Poster && data.Poster !== "N/A") coverImage = data.Poster;
                if (data.imdbRating && data.imdbRating !== "N/A") score = data.imdbRating;
              }
            } catch (e) {
              console.error("[Cron Recs] OMDb fetch failed:", e);
            }
          }

          if (!coverImage) {
            try {
              const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(geminiResult.title)}`);
              if (res.ok) {
                const data = await res.json();
                if (data.image?.medium) coverImage = data.image.medium;
                if (data.rating?.average) score = String(data.rating.average);
              }
            } catch (e) {
              console.error("[Cron Recs] TVMaze fetch failed:", e);
            }
          }
        }

        const payload: DailyRecommendation = {
          type,
          title: geminiResult.title,
          releaseYear: geminiResult.releaseYear,
          author: geminiResult.author || "",
          synopsis: geminiResult.synopsis || "",
          rationale: geminiResult.rationale || "",
          coverImage,
          score,
          isLogged: false,
          date: dateStr,
        };

        await adminSaveDailyRecommendation(user.uid, type, dateStr, payload);
        return true;
      } catch (e) {
        console.error(`[Cron Recs] Failed to generate "${type}" for uid ${user.uid}:`, e);
        return false;
      }
      })()
    );
  }

  const generated = outcomes.filter(Boolean).length;
  if (generated === 0) {
    return { sent: false, reason: "all recommendation types failed" };
  }
  await markCronAsSentToday("recommendations", user.uid, dateStr);
  return { sent: true, generated };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify cron authorization
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    const dateStr = getCalendarIstDate();
    const force = req.nextUrl.searchParams.get("force") === "true";

    // 2. Fan out across every registered user via Admin SDK.
    const users = await listAllUsers();

    const results: { uid: string; email: string; sent: boolean; reason?: string; error?: string }[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, geminiApiKey, dateStr, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/recommendations for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    const processedCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, date: dateStr, usersProcessed: users.length, usersGenerated: processedCount, results });
  } catch (error: any) {
    console.error("[Cron Recs Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
