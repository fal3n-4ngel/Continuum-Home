import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/openapi.json/route";

describe("openapi portfolio schema parity", () => {
  it("matches the validator contract", async () => {
    const spec = await (await GET()).json();
    const asset = spec.components.schemas.InvestmentAsset;
    const patch = spec.components.schemas.InvestmentAssetPatch;

    const expectedCategories = ["equity", "crypto", "mutual_fund", "sip", "gold", "cash", "fixed_deposit", "other"];
    expect(asset.properties.category.enum).toEqual(expectedCategories);
    expect(patch.properties.category.enum).toEqual(expectedCategories);

    // Every field validateInvestmentAsset() accepts must be documented.
    const expected = [
      "id", "name", "category", "amount", "investedAmount", "quantity", "buyPrice",
      "currentPrice", "previousClose", "notes", "createdAt", "isSold", "soldAt",
      "soldPrice", "mfSchemeCode", "sipDay", "interestRate", "startDate",
      "maturityDate", "compounding",
    ];
    expect(Object.keys(asset.properties).sort()).toEqual([...expected].sort());

    // Patch documents the same fields minus the server-owned ones.
    const patchExpected = expected.filter((f) => f !== "id" && f !== "createdAt");
    expect(Object.keys(patch.properties).sort()).toEqual([...patchExpected].sort());

    expect(asset.properties.compounding.enum).toEqual(["monthly", "quarterly", "half_yearly", "yearly"]);
    expect(asset.properties.sipDay).toMatchObject({ type: "integer", minimum: 1, maximum: 31 });
    expect(new RegExp(asset.properties.mfSchemeCode.pattern).test("118989")).toBe(true);
    expect(new RegExp(asset.properties.mfSchemeCode.pattern).test("../../evil")).toBe(false);
  });

  it("still marks every write operation non-consequential", async () => {
    const spec = await (await GET()).json();
    for (const [path, methods] of Object.entries<any>(spec.paths)) {
      for (const [method, op] of Object.entries<any>(methods)) {
        if (["post", "patch", "delete"].includes(method)) {
          expect(op["x-openai-isConsequential"], `${method.toUpperCase()} ${path}`).toBe(false);
        }
      }
    }
  });
});
