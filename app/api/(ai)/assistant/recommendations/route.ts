import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listWatchlist, getDailyRecommendation, saveDailyRecommendation, getSettings, DailyRecommendation } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError, toErrorResponse } from "@/lib/utils";
import {
  reserveGeminiCall,
  acquireGenerationLock,
  isGeminiQuotaError,
  executeGroqJson,
  postDiscordEmbed,
  codeBlock,
  DISCORD_ORANGE,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

const VALID_TYPES: Record<string, "movie" | "show" | "anime" | "book"> = {
  movie: "movie",
  show: "show",
  anime: "anime",
  book: "book",
};

function getActiveIstDate() {
  const nowUtc = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc.getTime() + istOffset);

  if (nowIst.getUTCHours() < 6) {
    nowIst.setUTCDate(nowIst.getUTCDate() - 1);
  }

  const yyyy = nowIst.getUTCFullYear();
  const mm = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowIst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const rawType = (req.nextUrl.searchParams.get("type") || "movie").toLowerCase().trim();
    const type = VALID_TYPES[rawType];
    if (!type) {
      throw new ApiError(400, "Invalid type. Must be one of: movie, show, anime, book.");
    }

    const dateStr = getActiveIstDate();
    const key = `${type}_${dateStr}`;

    const settings = await getSettings(session).catch(() => null);
    if (settings?.aiOptOut) {
      return NextResponse.json({ recommendation: null, aiOptOut: true });
    }

    const currentRec = await getDailyRecommendation(session, type, dateStr);
    if (currentRec) {
      return NextResponse.json({ recommendation: currentRec });
    }

    const gotLock = await acquireGenerationLock(session.uid, type, dateStr);
    if (!gotLock) {
      return NextResponse.json({ recommendation: null });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!geminiApiKey && !groqApiKey) {
      return NextResponse.json({ recommendation: null });
    }

    const withinBudget = geminiApiKey ? await reserveGeminiCall() : false;
    if (!withinBudget && !groqApiKey) {
      return NextResponse.json({ recommendation: null });
    }

    const allItems = await listWatchlist(session);
    const existingTitles = allItems.map((item) => item.title.toLowerCase().trim());
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

Return no other text, comments or markdown blocks. Just the raw JSON object.
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

Return no other text, comments or markdown blocks. Just the raw JSON object.
`;
    }

    let geminiResult: any = null;

    if (withinBudget && geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        const response = await model.generateContent(prompt);
        geminiResult = JSON.parse(response.response.text().trim());
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.warn("[recommendations] Gemini failed, attempting Groq fallback:", errMsg);
        postDiscordEmbed({
          title: "⚠️ Daily Recommendations: Gemini Failed (Groq Fallback Active)",
          color: DISCORD_ORANGE,
          fields: [
            { name: "Error Reason", value: codeBlock(errMsg) },
            { name: "User", value: session.user.email || session.uid, inline: true },
            { name: "Media Type", value: type, inline: true },
          ],
          footer: { text: "Continuum Assistant • Recommendations Fallback" },
        }).catch(() => {});
      }
    }

    if (!geminiResult && process.env.GROQ_API_KEY) {
      try {
        geminiResult = await executeGroqJson(prompt);
      } catch (groqErr: any) {
        const groqErrMsg = groqErr?.message || String(groqErr);
        console.warn("[recommendations] Groq fallback failed:", groqErrMsg);
        postDiscordEmbed({
          title: "⚠️ Daily Recommendations: Groq Fallback Failed",
          color: DISCORD_ORANGE,
          fields: [
            { name: "Groq Error Reason", value: codeBlock(groqErrMsg) },
            { name: "User", value: session.user.email || session.uid, inline: true },
            { name: "Media Type", value: type, inline: true },
          ],
          footer: { text: "Continuum Assistant • Recommendations Failed" },
        }).catch(() => {});
      }
    }

    if (!geminiResult) {
      return NextResponse.json({ recommendation: null });
    }
    const title = typeof geminiResult.title === "string" ? geminiResult.title.trim() : "";
    const releaseYear = typeof geminiResult.releaseYear === "string" || typeof geminiResult.releaseYear === "number"
      ? String(geminiResult.releaseYear).trim()
      : "";

    let coverImage: string | null = null;
    let score: string | null = null;

    if (type === "book") {
      if (title) {
        try {
          const url = new URL("https://openlibrary.org/search.json");
          url.searchParams.set("q", title);
          url.searchParams.set("limit", "1");
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            const doc = data.docs?.[0];
            if (doc?.cover_i && Number.isInteger(doc.cover_i)) {
              coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
            }
          }
        } catch (e) {
          console.error("OpenLibrary fallback fetch failed:", e);
        }
      }
    } else {
      const omdbKey = process.env.OMDB_API_KEY;
      if (omdbKey && title) {
        try {
          const url = new URL("https://www.omdbapi.com/");
          url.searchParams.set("t", title);
          if (releaseYear) {
            url.searchParams.set("y", releaseYear);
          }
          url.searchParams.set("apikey", omdbKey);
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            if (data.Poster && data.Poster !== "N/A") coverImage = data.Poster;
            if (data.imdbRating && data.imdbRating !== "N/A") score = data.imdbRating;
          }
        } catch (e) {
          console.error("OMDb fallback fetch failed:", e);
        }
      }

      if (!coverImage && title) {
        try {
          const url = new URL("https://api.tvmaze.com/singlesearch/shows");
          url.searchParams.set("q", title);
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            if (data.image?.medium) coverImage = data.image.medium;
            if (data.rating?.average) score = String(data.rating.average);
          }
        } catch (e) {
          console.error("TVMaze fallback fetch failed:", e);
        }
      }
    }

    const payload: DailyRecommendation = {
      type,
      title,
      releaseYear,
      author: typeof geminiResult.author === "string" ? geminiResult.author : "",
      synopsis: typeof geminiResult.synopsis === "string" ? geminiResult.synopsis : "",
      rationale: typeof geminiResult.rationale === "string" ? geminiResult.rationale : "",
      coverImage,
      score,
      isLogged: false,
      date: dateStr,
    };

    await saveDailyRecommendation(session, type, dateStr, payload);

    return NextResponse.json({ recommendation: payload });
  } catch (error) {
    return toErrorResponse(error, "GET /api/assistant/recommendations");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const { type: rawType, date, isLogged } = body;

    if (!rawType || !date) {
      throw new ApiError(400, "Missing type or date parameters.");
    }

    const type = typeof rawType === "string" ? VALID_TYPES[rawType.toLowerCase().trim()] : undefined;
    if (!type) {
      throw new ApiError(400, "Invalid type. Must be one of: movie, show, anime, book.");
    }

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, "Invalid date format. Must be YYYY-MM-DD.");
    }

    const currentRec = await getDailyRecommendation(session, type, date);

    if (!currentRec) {
      throw new ApiError(404, "Recommendation not found.");
    }

    currentRec.isLogged = !!isLogged;
    await saveDailyRecommendation(session, type, date, currentRec);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "POST /api/assistant/recommendations");
  }
}
