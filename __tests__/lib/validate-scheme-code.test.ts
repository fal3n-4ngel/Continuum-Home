import { describe, it, expect } from "vitest";
import { validatePortfolioAssets, validatePortfolioAssetPatch } from "@/lib/validate";

function assetWith(mfSchemeCode: unknown) {
  return { assets: [{ name: "HDFC Mid Cap", category: "sip", amount: 1000, investedAmount: 1000, mfSchemeCode }] };
}

// mfSchemeCode is interpolated into the mfapi.in NAV request in lib/prices.ts,
// so rejecting a malformed one at the API boundary is a request-forgery guard,
// not just input tidiness.
describe("mfSchemeCode validation", () => {
  it("accepts a numeric AMFI scheme code", () => {
    const [asset] = validatePortfolioAssets(assetWith("118989"));
    expect(asset.mfSchemeCode).toBe("118989");
  });

  it("treats an absent code as optional", () => {
    const [asset] = validatePortfolioAssets(assetWith(undefined));
    expect(asset.mfSchemeCode).toBeUndefined();
  });

  it.each([
    "../../../admin",
    "https://evil.example.com/",
    "//evil.example.com",
    "118989?redirect=evil",
    "118989/../secret",
    "abc",
    "118 989",
  ])("rejects %s with a 400", (code) => {
    expect(() => validatePortfolioAssets(assetWith(code))).toThrowError(/mfSchemeCode/);
  });

  it("applies the same rule to PATCH updates", () => {
    expect(() => validatePortfolioAssetPatch({ mfSchemeCode: "../../evil" })).toThrowError(/mfSchemeCode/);
    expect(validatePortfolioAssetPatch({ mfSchemeCode: "105758" }).mfSchemeCode).toBe("105758");
  });
});
