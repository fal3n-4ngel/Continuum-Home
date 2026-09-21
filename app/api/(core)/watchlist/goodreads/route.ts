import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/utils";
import type { SyncEntry } from "@/lib/firebase";

export const dynamic = "force-dynamic";

const GOODREADS_SHELVES = [
  { shelf: "currently-reading", status: "watching" as const },
  { shelf: "read", status: "completed" as const },
  { shelf: "to-read", status: "plan_to_watch" as const },
];

const XML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function cleanXmlText(text: string | null | undefined): string | null {
  if (!text) return null;
  let cleaned = text;
  if (cleaned.startsWith("<![CDATA[") && cleaned.endsWith("]]>")) {
    cleaned = cleaned.slice(9, -3);
  } else {
    cleaned = cleaned.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  }
  return (
    cleaned
      .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (match) => XML_ENTITY_MAP[match] || match)
      .trim() || null
  );
}

export function parseGoodreadsRssXml(xml: string, defaultStatus: "watching" | "completed" | "plan_to_watch"): SyncEntry[] {
  const items = xml.split("<item>");
  items.shift(); // remove header before first item

  const entries: SyncEntry[] = [];

  for (const item of items) {
    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const authorMatch = item.match(/<author_name>([\s\S]*?)<\/author_name>/);
    const coverMatch = item.match(/<book_large_image_url>([\s\S]*?)<\/book_large_image_url>/)
      || item.match(/<book_medium_image_url>([\s\S]*?)<\/book_medium_image_url>/)
      || item.match(/<book_image_url>([\s\S]*?)<\/book_image_url>/);
    const yearMatch = item.match(/<book_published>([\s\S]*?)<\/book_published>/);
    const ratingMatch = item.match(/<user_rating>([\s\S]*?)<\/user_rating>/);

    const title = cleanXmlText(titleMatch?.[1]);
    if (!title) continue;

    const rawAuthor = cleanXmlText(authorMatch?.[1]);
    const coverUrl = cleanXmlText(coverMatch?.[1]);
    const rawYear = cleanXmlText(yearMatch?.[1]);
    const rawRating = cleanXmlText(ratingMatch?.[1]);

    const year = rawYear && /^\d{4}$/.test(rawYear) ? parseInt(rawYear, 10) : null;
    const parsedRating = rawRating ? parseFloat(rawRating) : 0;
    const rating = parsedRating > 0 && parsedRating <= 5 ? Math.round(parsedRating * 2) : null;

    // Filter out Goodreads placeholder/nophoto image URLs
    const isRealCover = coverUrl && !coverUrl.includes("nophoto") && coverUrl.startsWith("http");

    entries.push({
      title,
      type: "book",
      status: defaultStatus,
      progress: defaultStatus === "completed" ? 1 : 0,
      totalEpisodes: 1,
      rating,
      coverImage: isRealCover ? coverUrl : null,
      year,
    });
  }

  return entries;
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);

    const rawUserId = req.nextUrl.searchParams.get("userId") || req.nextUrl.searchParams.get("username");
    if (!rawUserId) {
      throw new ApiError(400, "Goodreads User ID query parameter is required (e.g. 12345678 or 12345678-username).");
    }

    let cleanedUserId = rawUserId.trim();
    if (cleanedUserId.length > 200) {
      throw new ApiError(400, "Goodreads User ID is too long.");
    }

    // Extract ID if a full profile URL was provided
    if (cleanedUserId.startsWith("http://") || cleanedUserId.startsWith("https://")) {
      try {
        const parsed = new URL(cleanedUserId);
        const segments = parsed.pathname.split("/").filter(Boolean);
        cleanedUserId = segments[segments.length - 1] || "";
      } catch {
        const lastSlash = cleanedUserId.lastIndexOf("/");
        if (lastSlash !== -1) {
          cleanedUserId = cleanedUserId.slice(lastSlash + 1);
        }
      }
    }

    // Strip query parameters, hashes, or path segments without regex backtracking
    cleanedUserId = cleanedUserId.split("/")[0].split("?")[0].split("#")[0].trim();

    // Validate: must start with a digit followed by up to 99 safe characters.
    // Non-overlapping character classes prevent polynomial ReDoS
    if (!cleanedUserId || !/^[0-9][a-zA-Z0-9_-]{0,99}$/.test(cleanedUserId)) {
      throw new ApiError(400, "Invalid Goodreads User ID. Find your numeric user ID in your Goodreads profile URL.");
    }

    const userId = cleanedUserId;

    // Fetch all 3 shelves in parallel
    const shelfResults = await Promise.allSettled(
      GOODREADS_SHELVES.map(async ({ shelf, status }) => {
        const feedUrl = `https://www.goodreads.com/review/list_rss/${encodeURIComponent(userId)}?shelf=${shelf}`;
        const res = await fetch(feedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new ApiError(404, `Goodreads user '${userId}' not found or profile is private.`);
          }
          throw new ApiError(res.status, `Goodreads returned status ${res.status} for shelf ${shelf}.`);
        }

        const xml = await res.text();
        return parseGoodreadsRssXml(xml, status);
      })
    );

    const allBooks: SyncEntry[] = [];
    const seenTitles = new Set<string>();

    for (const result of shelfResults) {
      if (result.status === "fulfilled") {
        for (const book of result.value) {
          const key = book.title.toLowerCase().trim();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            allBooks.push(book);
          }
        }
      }
    }

    if (allBooks.length === 0) {
      // Check if any requests succeeded
      const failed = shelfResults.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) {
        throw failed.reason;
      }
    }

    return NextResponse.json({ userId, books: allBooks });
  } catch (error) {
    return toErrorResponse(error, "GET /api/watchlist/goodreads");
  }
}
