import { describe, it, expect } from "vitest";
import { validateSettingsPatch } from "@/lib/firebase/validate";

describe("Settings Privacy Validation", () => {
  it("accepts aiOptOut set to true", () => {
    const res = validateSettingsPatch({ aiOptOut: true });
    expect(res.aiOptOut).toBe(true);
  });

  it("accepts aiOptOut set to false", () => {
    const res = validateSettingsPatch({ aiOptOut: false });
    expect(res.aiOptOut).toBe(false);
  });

  it("rejects non-boolean aiOptOut values", () => {
    expect(() => validateSettingsPatch({ aiOptOut: "true" })).toThrow("Field 'aiOptOut' must be a boolean.");
    expect(() => validateSettingsPatch({ aiOptOut: 1 })).toThrow("Field 'aiOptOut' must be a boolean.");
    expect(() => validateSettingsPatch({ aiOptOut: null })).toThrow("Field 'aiOptOut' must be a boolean.");
  });

  it("includes aiOptOut alongside other valid fields", () => {
    const res = validateSettingsPatch({
      salaryDay: 15,
      aiOptOut: true,
      currency: "₹",
    });
    expect(res.salaryDay).toBe(15);
    expect(res.aiOptOut).toBe(true);
    expect(res.currency).toBe("₹");
  });
});
