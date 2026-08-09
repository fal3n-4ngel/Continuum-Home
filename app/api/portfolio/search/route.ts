import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface YahooQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  quoteType?: string;
}

interface MfSchemeRaw {
  schemeCode: number;
  schemeName: string;
  isinGrowth: string | null;
  isinDivReinvestment: string | null;
}

async function searchYahoo(query: string) {
  const res = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0`);
  if (!res.ok) return [];
  const data = await res.json();
  const rawQuotes = (data?.quotes || []) as YahooQuote[];
  return rawQuotes.map((q) => ({
    symbol: q.symbol,
    name: q.shortname || q.longname || q.symbol,
    exchange: q.exchange,
    type: q.quoteType, // e.g. EQUITY, CRYPTOCURRENCY, MUTUALFUND
  }));
}

// mfapi.in's own /mf/search endpoint caps out at 15 results ordered by
// scheme code ascending (i.e. oldest funds first), so a broad query like
// "HDFC" surfaces decades-old matured FMPs and dividend plans instead of
// the live Direct Growth schemes people actually SIP into today. We cache
// AMFI's full ~38k-scheme dump once per server instance and rank matches
// ourselves instead.
let mfDirectoryCache: { data: MfSchemeRaw[]; fetchedAt: number } | null = null;
const MF_DIRECTORY_TTL = 12 * 60 * 60 * 1000; // AMFI's scheme list changes rarely

async function getMfDirectory(): Promise<MfSchemeRaw[]> {
  if (mfDirectoryCache && Date.now() - mfDirectoryCache.fetchedAt < MF_DIRECTORY_TTL) {
    return mfDirectoryCache.data;
  }
  try {
    const res = await fetch("https://api.mfapi.in/mf");
    if (!res.ok) return mfDirectoryCache?.data || [];
    const data = (await res.json()) as MfSchemeRaw[];
    mfDirectoryCache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return mfDirectoryCache?.data || [];
  }
}

const CLOSED_ENDED_RE = /\bfmp\b|fixed maturity|interval fund|capital protection|close[d]? ended|\bnfo\b/i;

async function searchMfApi(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const directory = await getMfDirectory();
  const matches = directory.filter((s) => {
    const nameLower = s.schemeName.toLowerCase();
    return words.every((w) => nameLower.includes(w));
  });

  const scored = matches.map((s) => {
    const nameLower = s.schemeName.toLowerCase();
    let score = 0;
    if (s.isinGrowth) score += 2; // has a live growth-plan ISIN
    if (nameLower.includes("direct")) score += 3;
    if (nameLower.includes("growth")) score += 3;
    if (nameLower.includes("idcw") || nameLower.includes("dividend")) score -= 3;
    if (CLOSED_ENDED_RE.test(nameLower)) score -= 8;
    if (nameLower.startsWith(words[0])) score += 1;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score || a.s.schemeName.localeCompare(b.s.schemeName));

  return scored.slice(0, 15).map(({ s }) => ({
    symbol: String(s.schemeCode),
    name: s.schemeName,
    exchange: "AMFI",
    type: "MUTUALFUND_IN",
    schemeCode: String(s.schemeCode),
  }));
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";

    if (!query.trim()) {
      return NextResponse.json({ quotes: [] });
    }

    // Indian mutual fund / SIP schemes: search AMFI's scheme list via
    // mfapi.in, plus Yahoo as a fallback for non-Indian funds.
    if (category === "mutual_fund" || category === "sip") {
      const [mfQuotes, yahooQuotes] = await Promise.all([
        searchMfApi(query).catch(() => []),
        searchYahoo(query).catch(() => []),
      ]);
      return NextResponse.json({ quotes: [...mfQuotes, ...yahooQuotes] });
    }

    const quotes = await searchYahoo(query).catch(() => []);
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("Error in GET /api/portfolio/search:", error);
    return NextResponse.json({ error: "Failed to search symbols" }, { status: 500 });
  }
}
