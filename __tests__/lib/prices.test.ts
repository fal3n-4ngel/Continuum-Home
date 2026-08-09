import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// vitest.setup.ts mocks @/lib/prices globally for the cron integration tests,
// so this suite has to reach past that to exercise the real implementation.
const { createPriceFetcher, fetchAssetPrice } = await vi.importActual<typeof import("@/lib/prices")>("@/lib/prices");

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

// The scheme code and the asset name are both client-supplied and both end up
// interpolated into an upstream URL, so neither may reach fetch() unvalidated.
describe("fetchAssetPrice request-target safety", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["path traversal", "../../../admin"],
    ["encoded traversal", "..%2f..%2fadmin"],
    ["absolute URL", "https://evil.example.com/"],
    ["protocol-relative URL", "//evil.example.com"],
    ["query injection", "118989?redirect=evil"],
    ["fragment injection", "118989#@evil.example.com"],
    ["non-numeric", "abc"],
    ["empty after trim", " "],
  ])("refuses to request a scheme code with %s", async (_label, code) => {
    const result = await fetchAssetPrice("sip", "HDFC Mid Cap", 83.5, code);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still requests a well-formed numeric scheme code", async () => {
    await fetchAssetPrice("sip", "HDFC Mid Cap", 83.5, "118989");

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://api.mfapi.in/mf/118989");
  });

  it.each([
    ["path traversal", "../../etc/passwd"],
    ["absolute URL", "https://evil.example.com"],
    ["a scheme name with spaces", "HDFC Mid Cap Fund - Growth"],
  ])("refuses to request an equity ticker with %s", async (_label, name) => {
    const result = await fetchAssetPrice("equity", name, 83.5);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still requests legitimate ticker shapes", async () => {
    for (const name of ["RELIANCE", "BRK-B", "^NSEI", "TCS.NS"]) {
      await fetchAssetPrice("equity", name, 83.5);
    }

    expect(fetchSpy).toHaveBeenCalledTimes(4);
    for (const call of fetchSpy.mock.calls) {
      expect(call[0]).toMatch(/^https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/[A-Z0-9.^=-]+$/);
    }
  });
});
