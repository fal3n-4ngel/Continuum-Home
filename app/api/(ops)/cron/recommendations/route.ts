import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/utils";
import { listAllUsers, adminListWatchlist, adminSaveDailyRecommendation, type AdminUser } from "@/lib/firebase/firebase-admin";
import type { DailyRecommendation } from "@/lib/firebase";
import { hasCronBeenSentToday, markCronAsSentToday } from "@/lib/cron";
import { reportCronFailures, reportCronAbort, type CronUserResult } from "@/lib/cron";
import { reserveAiCall, executeGroqJson } from "@/lib/integrations";
import { env } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

async function processUser(user: AdminUser, dateStr: string, force: boolean = false): Promise<ProcessResult> {
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

  const outcomes: boolean[] = [];
  for (const type of TYPES) {
    outcomes.push(
      await (async () => {
      try {
        const withinBudget = await reserveAiCall();
        if (!withinBudget) {
          console.warn(`[Cron Recs] Daily AI budget exhausted, skipping "${type}" for uid ${user.uid}`);
          return false;
        }

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

        const groqResult = await executeGroqJson(prompt);

        let coverImage: string | null = null;
        let score: string | null = null;

        if (type === "book") {
          try {
            const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(groqResult.title)}&limit=1`);
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
          const omdbKey = process.env.OMDB_API_KEY;
          if (omdbKey) {
            try {
              const res = await fetch(
                `https://www.omdbapi.com/?t=${encodeURIComponent(groqResult.title)}&y=${groqResult.releaseYear || ""}&apikey=${omdbKey}`
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
              const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(groqResult.title)}`);
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
          title: groqResult.title,
          releaseYear: groqResult.releaseYear,
          author: groqResult.author || "",
          synopsis: groqResult.synopsis || "",
          rationale: groqResult.rationale || "",
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
    const authHeader = req.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      reportCronAbort("recommendations", "Missing GROQ_API_KEY");
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
    }

    const dateStr = getCalendarIstDate();
    const force = req.nextUrl.searchParams.get("force") === "true";

    const users = await listAllUsers();

    const results: CronUserResult[] = [];
    for (const user of users) {
      try {
        const outcome = await processUser(user, dateStr, force);
        results.push({ uid: user.uid, email: user.email, sent: outcome.sent, reason: outcome.sent ? undefined : outcome.reason });
      } catch (err: any) {
        console.error(`Error in cron/recommendations for uid ${user.uid}:`, err);
        results.push({ uid: user.uid, email: user.email, sent: false, error: err.message || "Unknown error" });
      }
    }

    reportCronFailures("recommendations", results);

    const processedCount = results.filter((r) => r.sent).length;
    return NextResponse.json({ success: true, date: dateStr, usersProcessed: users.length, usersGenerated: processedCount, results });
  } catch (error: any) {
    return toErrorResponse(error, "Error in cron/recommendations");
  }
}
