// Everything below interpolates a value derived from a user-supplied asset
// name (or a stored scheme code) into an upstream URL. These patterns are the
// gate: a value that can't be a real symbol is rejected before it reaches a
// request, rather than being escaped and sent anyway. Anything rejected here
// resolves to null, which is the same outcome the caller already handles for
// an unknown symbol.

// AMFI scheme codes are numeric — see https://api.mfapi.in/mf.
const AMFI_SCHEME_CODE = /^\d{1,10}$/;

// Yahoo symbols are alphanumeric with a small set of separators:
// exchange suffixes (RELIANCE.NS), share classes (BRK-B), indices (^NSEI),
// and currency pairs (USDINR=X).
const YAHOO_TICKER = /^[A-Z0-9.^=-]{1,20}$/;

// Binance pairs are strictly alphanumeric (BTCUSDT).
const BINANCE_SYMBOL = /^[A-Z0-9]{5,20}$/;

function getBinanceSymbol(name: string): string | null {
  const clean = name.trim().toUpperCase();
  if (['BTC', 'BITCOIN'].includes(clean)) return 'BTCUSDT';
  if (['ETH', 'ETHEREUM'].includes(clean)) return 'ETHUSDT';
  if (['SOL', 'SOLANA'].includes(clean)) return 'SOLUSDT';
  if (['ADA', 'CARDANO'].includes(clean)) return 'ADAUSDT';
  if (['DOGE', 'DOGECOIN'].includes(clean)) return 'DOGEUSDT';
  if (['XRP'].includes(clean)) return 'XRPUSDT';
  if (['BNB'].includes(clean)) return 'BNBUSDT';
  if (clean.length >= 3 && clean.length <= 5) {
    const symbol = `${clean}USDT`;
    return BINANCE_SYMBOL.test(symbol) ? symbol : null;
  }
  return null;
}

function getYahooTicker(name: string): string {
  const clean = name.trim().toUpperCase();
  if (clean === 'APPLE') return 'AAPL';
  if (clean === 'TESLA') return 'TSLA';
  if (clean === 'MICROSOFT') return 'MSFT';
  if (clean === 'GOOGLE' || clean === 'ALPHABET') return 'GOOGL';
  if (clean === 'AMAZON') return 'AMZN';
  if (clean === 'META') return 'META';
  if (clean === 'NVIDIA') return 'NVDA';
  if (clean === 'RELIANCE') return 'RELIANCE.NS';
  if (clean === 'TCS') return 'TCS.NS';
  if (clean === 'HDFC') return 'HDFCBANK.NS';
  if (clean === 'INFOSYS' || clean === 'INFY') return 'INFY.NS';
  if (clean === 'ICICI') return 'ICICIBANK.NS';
  if (clean === 'SBI' || clean === 'SBIN') return 'SBIN.NS';
  if (clean === 'TATAMOTORS') return 'TATAMOTORS.NS';
  return clean;
}

export interface AssetPrice {
  priceInr: number;
  priceUsd: number;
  previousCloseInr: number | null;
  previousCloseUsd: number | null;
}

export type PriceFetcher = (category: string, name: string, usdToInr: number, mfSchemeCode?: string) => Promise<AssetPrice | null>;

// Dedupes identical price lookups for the lifetime of the returned function.
// The cron routes fan out across every user, and holdings overlap heavily
// (everyone owns some BTC or NIFTY tracker), so without this a single run
// hammers Yahoo/Binance/AMFI with the same request once per user — slow, and
// a good way to get rate-limited mid-run.
//
// Promises are cached rather than resolved values so that concurrent lookups
// of the same asset (assets within a user are fetched via Promise.all) share
// one in-flight request instead of racing to start several.
export function createPriceFetcher(): PriceFetcher {
  const inFlight = new Map<string, Promise<AssetPrice | null>>();
  return (category, name, usdToInr, mfSchemeCode) => {
    const key = `${category}:${name.trim().toUpperCase()}:${mfSchemeCode || ""}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = fetchAssetPrice(category, name, usdToInr, mfSchemeCode);
      inFlight.set(key, pending);
    }
    return pending;
  };
}

export async function fetchAssetPrice(
  category: string,
  name: string,
  usdToInr: number,
  mfSchemeCode?: string
): Promise<AssetPrice | null> {
  if ((category === 'mutual_fund' || category === 'sip') && mfSchemeCode) {
    // Indian AMC mutual fund/SIP schemes are priced by AMFI NAV, not by a
    // Yahoo-style ticker — mfapi.in mirrors the daily AMFI NAV feed.
    //
    // Re-checked here rather than trusted from storage: the code is written by
    // the client, and holdings saved before this validation existed are still
    // in Firestore.
    if (!AMFI_SCHEME_CODE.test(mfSchemeCode)) {
      console.error("Rejected malformed AMFI scheme code: %s", mfSchemeCode);
      return null;
    }
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${mfSchemeCode}`);
      if (res.ok) {
        const data = await res.json();
        const history = Array.isArray(data?.data) ? data.data : [];
        const nav = history[0] ? parseFloat(history[0].nav) : NaN;
        if (!isNaN(nav)) {
          const prevNav = history[1] ? parseFloat(history[1].nav) : NaN;
          return {
            priceInr: nav,
            priceUsd: nav / usdToInr,
            previousCloseInr: !isNaN(prevNav) ? prevNav : null,
            previousCloseUsd: !isNaN(prevNav) ? prevNav / usdToInr : null,
          };
        }
      }
    } catch (err) {
      // %s rather than interpolation: console.* treats the first argument as a
      // format string, so a code containing "%s" would otherwise swallow `err`.
      console.error("Error fetching MF NAV for scheme %s:", mfSchemeCode, err);
    }
    return null;
  }

  if (category === 'crypto') {
    const binanceSymbol = getBinanceSymbol(name);
    if (binanceSymbol) {
      try {
        // 24hr ticker (not the plain price endpoint) so we get prevClosePrice
        // alongside lastPrice in the same request — crypto trades round the
        // clock, so this rolling 24h window is the closest equivalent to a
        // market's "previous close" for a day-change figure.
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(binanceSymbol)}`);
        if (res.ok) {
          const data = await res.json();
          const priceUsd = parseFloat(data.lastPrice);
          const prevCloseUsd = parseFloat(data.prevClosePrice);
          if (!isNaN(priceUsd)) {
            return {
              priceInr: priceUsd * usdToInr,
              priceUsd,
              previousCloseInr: !isNaN(prevCloseUsd) ? prevCloseUsd * usdToInr : null,
              previousCloseUsd: !isNaN(prevCloseUsd) ? prevCloseUsd : null,
            };
          }
        }
      } catch (err) {
        console.error("Error fetching crypto price for %s:", name, err);
      }
    }
  } else if (category === 'equity' || category === 'mutual_fund' || category === 'sip') {
    const ticker = getYahooTicker(name);
    // Free-text asset names reach this path (a name that isn't in the alias
    // table above is used as the ticker verbatim), so it needs the same gate
    // as the scheme code. A name that can't be a symbol has no match upstream
    // anyway — this just fails it before the request instead of after.
    if (!YAHOO_TICKER.test(ticker)) return null;
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
        const currencyCode = meta?.currency || "USD";

        if (price !== undefined) {
          let priceInr = price;
          let priceUsd = price;
          let previousCloseInr: number | null = null;
          let previousCloseUsd: number | null = null;

          if (currencyCode === "USD") {
            priceInr = price * usdToInr;
            if (prevClose !== undefined) {
              previousCloseUsd = prevClose;
              previousCloseInr = prevClose * usdToInr;
            }
          } else if (currencyCode === "INR") {
            priceUsd = price / usdToInr;
            if (prevClose !== undefined) {
              previousCloseInr = prevClose;
              previousCloseUsd = prevClose / usdToInr;
            }
          } else if (prevClose !== undefined) {
            previousCloseInr = prevClose;
            previousCloseUsd = prevClose;
          }

          return {
            priceInr,
            priceUsd,
            previousCloseInr,
            previousCloseUsd,
          };
        }
      }
    } catch (err) {
      console.error("Error fetching stock price for %s:", ticker, err);
    }
  }
  return null;
}

export async function getUsdToInrRate(): Promise<number> {
  try {
    const exRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (exRes.ok) {
      const exData = await exRes.json();
      if (exData?.rates?.INR) {
        return exData.rates.INR;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch exchange rate, using fallback 83.5:", e);
  }
  return 83.5;
}
