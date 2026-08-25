import { describe, it, expect } from "vitest";
import { buildExpensesEmail, expensesPeriodTitle } from "@/emails/templates/expenses";
import { buildSubscriptionsEmail } from "@/emails/templates/subscriptions";
import { buildAnnouncementEmail } from "@/emails/templates/announcement";
import { samplePortfolio, sampleExpenses, sampleSubscriptions } from "@/emails/samples";
import { buildPortfolioEmail } from "@/emails/templates/portfolio";

const APP = "https://continuum-home.vercel.app";
const UNSUB = "https://continuum-home.vercel.app/api/unsubscribe?uid=u1&category=expenses&token=abc";

describe("expenses email template", () => {
  const data = sampleExpenses("weekly", APP, UNSUB);

  it("titles weekly and monthly distinctly", () => {
    expect(expensesPeriodTitle("weekly")).toBe("Weekly Expense Summary");
    expect(expensesPeriodTitle("monthly")).toBe("Monthly Expense Summary");
    expect(buildExpensesEmail(sampleExpenses("monthly", APP)).subject).toContain("Monthly Expense Summary");
  });

  it("renders the unsubscribe footer only when a URL is supplied", () => {
    expect(buildExpensesEmail(data).html).toContain("Unsubscribe from expense summaries");
    expect(buildExpensesEmail({ ...data, unsubscribeUrl: undefined }).html).not.toContain("Unsubscribe from expense");
  });

  it("renders every category with its bar width", () => {
    const { html } = buildExpensesEmail(data);
    expect(html).toContain("Food &amp; Dining".replace("&amp;", "&"));
    expect(html).toContain("width:34%");
  });

  it("falls back to Uncategorized for a null category", () => {
    const { html } = buildExpensesEmail({
      ...data,
      topExpenses: [{ title: "Mystery", category: null, date: "2026-08-01", amount: 100 }],
    });
    expect(html).toContain("Uncategorized");
    expect(html).not.toContain("null");
  });

  it("emits no unresolved values", () => {
    const { html } = buildExpensesEmail(data);
    for (const bad of ["undefined", "NaN", "[object Object]"]) expect(html).not.toContain(bad);
  });
});

describe("subscriptions email template", () => {
  const data = sampleSubscriptions(APP, UNSUB);

  it("counts renewals in the subject", () => {
    expect(buildSubscriptionsEmail(data).subject).toBe("Alert: 3 Upcoming Subscription Renewals");
  });

  it("renders each renewal with its countdown", () => {
    const { html } = buildSubscriptionsEmail(data);
    expect(html).toContain("GitHub Copilot");
    expect(html).toContain("RENEWING IN 2 DAYS");
    expect(html).toContain("RENEWING IN 3 DAYS");
  });

  it("substitutes a default icon when none is set", () => {
    const { html } = buildSubscriptionsEmail(data);
    expect(html).toContain("💳");
    expect(html).not.toContain("null");
  });

  it("distinguishes yearly from monthly billing", () => {
    const { html } = buildSubscriptionsEmail(data);
    expect(html).toContain("Yearly");
    expect(html).toContain("Monthly");
  });
});

describe("announcement email template", () => {
  const base = { subject: "Scheduled maintenance", title: "Planned downtime", content: "Line one\nLine two", appUrl: APP };

  it("tags preview subjects and banners them", () => {
    const preview = buildAnnouncementEmail({ ...base, isPreview: true });
    expect(preview.subject).toBe("[ANNOUNCEMENT PREVIEW] Scheduled maintenance");
    expect(preview.html).toContain("ANNOUNCEMENT PREVIEW");
  });

  it("leaves a real broadcast subject untouched", () => {
    const real = buildAnnouncementEmail(base);
    expect(real.subject).toBe("Scheduled maintenance");
    expect(real.html).not.toContain("ANNOUNCEMENT PREVIEW");
  });

  // Author newlines must survive; the body is rendered with pre-wrap.
  it("preserves newlines in author content", () => {
    expect(buildAnnouncementEmail(base).html).toContain("Line one\nLine two");
    expect(buildAnnouncementEmail(base).html).toContain("white-space: pre-wrap");
  });
});

// The bug this whole module exists to prevent: the admin preview silently
// drifting from what the crons actually send.
describe("preview/production parity", () => {
  it("renders the unsubscribe footer in previews too", () => {
    expect(buildPortfolioEmail(samplePortfolio(APP, UNSUB)).html).toContain("Unsubscribe from portfolio updates");
    expect(buildExpensesEmail(sampleExpenses("weekly", APP, UNSUB)).html).toContain("Unsubscribe from expense summaries");
    expect(buildSubscriptionsEmail(sampleSubscriptions(APP, UNSUB)).html).toContain("Unsubscribe from renewal alerts");
  });

  it("marks every sample as preview so real data is never implied", () => {
    for (const html of [
      buildPortfolioEmail(samplePortfolio(APP)).html,
      buildExpensesEmail(sampleExpenses("weekly", APP)).html,
      buildSubscriptionsEmail(sampleSubscriptions(APP)).html,
    ]) {
      expect(html).toContain("EMAIL PREVIEW");
    }
  });

  it("shares one stylesheet across every template", () => {
    const htmls = [
      buildPortfolioEmail(samplePortfolio(APP)).html,
      buildExpensesEmail(sampleExpenses("weekly", APP)).html,
      buildSubscriptionsEmail(sampleSubscriptions(APP)).html,
    ];
    for (const html of htmls) expect(html).toContain(".bento-card");
  });
});
