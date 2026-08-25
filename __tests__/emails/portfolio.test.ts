import { describe, it, expect } from "vitest";
import { buildPortfolioEmail, type PortfolioEmailData } from "@/emails/templates/portfolio";

const base: PortfolioEmailData = {
  todayStr: "Monday, 25 Aug 2026",
  totalCurrent: 125000.5,
  totalInvested: 100000,
  overallPnl: 25000.5,
  overallPnlPercent: 25.0,
  dailyChange: 1240,
  weeklyChange: -310,
  holdings: [
    { name: "RELIANCE", category: "equity", quantity: 10, currentPrice: 2600, currentValue: 26000, pnl: 1000, pnlPercent: 4 },
    { name: "HDFC FD", category: "fixed_deposit", quantity: 1, currentPrice: 100000, currentValue: 107000, pnl: 7000, pnlPercent: 7 },
  ],
  usdToInr: 83.5,
  appUrl: "https://continuum-home.vercel.app",
};

describe("portfolio email template", () => {
  it("renders the unsubscribe footer when a URL is supplied", () => {
    const { html } = buildPortfolioEmail({ ...base, unsubscribeUrl: "https://x.test/unsub?t=1" });
    expect(html).toContain("https://x.test/unsub?t=1");
    expect(html).toContain("Unsubscribe from portfolio updates");
  });

  // Transactional sends (admin preview) have no list to leave, so the footer
  // must not invite an unsubscribe that would do nothing.
  it("omits the unsubscribe footer when no URL is supplied", () => {
    const { html } = buildPortfolioEmail(base);
    expect(html).not.toContain("Unsubscribe from portfolio updates");
  });

  it("shows the sample-data banner only in preview mode", () => {
    expect(buildPortfolioEmail({ ...base, isPreview: true }).html).toContain("EMAIL PREVIEW");
    expect(buildPortfolioEmail(base).html).not.toContain("EMAIL PREVIEW");
  });

  it("builds a subject carrying valuation and signed percentage", () => {
    expect(buildPortfolioEmail(base).subject).toBe("Daily Portfolio Close: ₹1,25,001 (+25.0%)");
    expect(buildPortfolioEmail({ ...base, overallPnlPercent: -8.25 }).subject).toContain("(-8.3%)");
  });

  it("renders every holding", () => {
    const { html } = buildPortfolioEmail(base);
    expect(html).toContain("RELIANCE");
    expect(html).toContain("HDFC FD");
    expect(html).toContain("fixed_deposit");
  });

  it("colours gains and losses independently of the overall total", () => {
    const { html } = buildPortfolioEmail({ ...base, dailyChange: 500, weeklyChange: -500 });
    expect(html).toContain("▲ +₹500");
    expect(html).toContain("▼ -₹500");
  });

  it("emits no unresolved template values", () => {
    const { html, subject } = buildPortfolioEmail({ ...base, unsubscribeUrl: "https://x.test/u" });
    for (const bad of ["undefined", "NaN", "[object Object]"]) {
      expect(html).not.toContain(bad);
      expect(subject).not.toContain(bad);
    }
  });

  it("survives an empty portfolio without emitting broken markup", () => {
    const { html } = buildPortfolioEmail({ ...base, holdings: [] });
    expect(html).toContain("Active Holdings Ledger");
    expect(html).not.toContain("undefined");
  });
});
