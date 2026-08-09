import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// vitest.setup.ts mocks @/lib/prices globally for the cron integration tests,
// so this suite has to reach past that to exercise the real implementation.
const { createPriceFetcher } = await vi.importActual<typeof import("@/lib/prices")>("@/lib/prices");

describe("createPriceFetcher", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 98, currency: "INR" } }] } }),
        { status: 200 }
      )
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("fetches an asset once no matter how many users hold it", async () => {
    const fetchPrice = createPriceFetcher();

    // Same holding appearing across three different users' portfolios.
    const results = await Promise.all([
      fetchPrice("equity", "RELIANCE", 83.5),
      fetchPrice("equity", "RELIANCE", 83.5),
      fetchPrice("equity", "RELIANCE", 83.5),
    ]);

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(results[0]?.priceInr).toBe(100);
    expect(results[1]).toBe(results[0]);
  });

  it("treats casing and surrounding whitespace as the same asset", async () => {
    const fetchPrice = createPriceFetcher();

    await fetchPrice("equity", "reliance", 83.5);
    await fetchPrice("equity", "  RELIANCE  ", 83.5);

    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("keeps distinct assets and mutual fund schemes separate", async () => {
    const fetchPrice = createPriceFetcher();

    await Promise.all([
      fetchPrice("equity", "RELIANCE", 83.5),
      fetchPrice("equity", "TCS", 83.5),
      // Same category+name, different AMFI scheme — must not collapse.
      fetchPrice("sip", "HDFC Mid Cap", 83.5, "118989"),
      fetchPrice("sip", "HDFC Mid Cap", 83.5, "105758"),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("does not leak its cache across separate cron runs", async () => {
    await createPriceFetcher()("equity", "RELIANCE", 83.5);
    await createPriceFetcher()("equity", "RELIANCE", 83.5);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
