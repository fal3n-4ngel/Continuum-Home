import Papa from "papaparse";
import type { SyncEntry } from "@/lib/firebase";

export interface GoodreadsCsvParseResult {
  books: SyncEntry[];
  totalParsed: number;
  errors: string[];
}

export function parseGoodreadsCsv(csvContent: string): GoodreadsCsvParseResult {
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const books: SyncEntry[] = [];
  const errors: string[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rawTitle = row["Title"] || row["title"] || "";
    // Clean trailing author or subtitle patterns if needed, or keep clean
    const title = rawTitle.trim();
    if (!title) continue;

    const rawShelf = (row["Exclusive Shelf"] || row["exclusive shelf"] || row["Bookshelves"] || "").toLowerCase().trim();
    let status: "watching" | "completed" | "plan_to_watch" = "completed";
    if (rawShelf.includes("currently-reading") || rawShelf.includes("reading")) {
      status = "watching";
    } else if (rawShelf.includes("to-read") || rawShelf.includes("plan_to_read") || rawShelf.includes("want to read")) {
      status = "plan_to_watch";
    } else if (rawShelf.includes("read") || !rawShelf) {
      status = "completed";
    }

    const rawRating = parseFloat(row["My Rating"] || row["my rating"] || "0");
    const rating = rawRating > 0 && rawRating <= 5 ? Math.round(rawRating * 2) : null;

    const rawYear = row["Original Publication Year"] || row["Year Published"] || row["year published"] || "";
    const cleanYear = rawYear.trim().match(/\b\d{4}\b/)?.[0];
    const year = cleanYear ? parseInt(cleanYear, 10) : null;

    books.push({
      title,
      type: "book",
      status,
      progress: status === "completed" ? 1 : 0,
      totalEpisodes: 1,
      rating,
      coverImage: null,
      year,
    });
  }

  return {
    books,
    totalParsed: books.length,
    errors,
  };
}
