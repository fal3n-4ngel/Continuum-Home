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

  it("accepts and validates lastSeenRelease", () => {
    const res = validateSettingsPatch({ lastSeenRelease: "rel_v1_2_1_1773200000000" });
    expect(res.lastSeenRelease).toBe("rel_v1_2_1_1773200000000");
  });

  it("handles empty or whitespace-only lastSeenRelease as undefined", () => {
    const res = validateSettingsPatch({ lastSeenRelease: "   ", salaryDay: 1 });
    expect(res.lastSeenRelease).toBeUndefined();
    expect(res.salaryDay).toBe(1);
  });

  it("validates integrations for anilist, trakt, and letterboxd", () => {
    const res = validateSettingsPatch({
      integrations: {
        anilist: { token: "ani_secret_token_123" },
        trakt: { accessToken: "trakt_acc_token", refreshToken: "trakt_ref_token" },
        letterboxd: { username: "cinephile99" },
      },
    });
    expect(res.integrations?.anilist?.token).toBe("ani_secret_token_123");
    expect(res.integrations?.trakt?.accessToken).toBe("trakt_acc_token");
    expect(res.integrations?.trakt?.refreshToken).toBe("trakt_ref_token");
    expect(res.integrations?.letterboxd?.username).toBe("cinephile99");
  });

  it("supports disconnecting individual integrations with null", () => {
    const res = validateSettingsPatch({
      integrations: {
        anilist: null,
        trakt: null,
      },
    });
    expect(res.integrations?.anilist).toBeNull();
    expect(res.integrations?.trakt).toBeNull();
  });
});
