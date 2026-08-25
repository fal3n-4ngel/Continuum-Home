import { htmlDoc, wrap, header, footer, title, sectionHeading, pill, previewBanner } from "../layout";
import { inr0, inr2 } from "../format";
import { COLORS } from "../theme";

export type ExpensePeriod = "weekly" | "monthly";

export interface CategorySlice {
  name: string;
  amount: number;
  percentage: number;
}

export interface TopExpense {
  title: string;
  category: string | null;
  date: string | null;
  amount: number | null;
}

export interface ExpensesEmailData {
  period: ExpensePeriod;
  periodRange: string;
  totalAmount: number;
  avgDaily: number;
  categories: CategorySlice[];
  topExpenses: TopExpense[];
  appUrl: string;
  unsubscribeUrl?: string;
  isPreview?: boolean;
}

// The hero deliberately breaks from the neutral palette to match the blue
// "Total Spent" tile on the dashboard, so the email reads as the same product.
const HERO_BG = "#bfdbfe";
const HERO_BORDER = "#93c5fd";
const HERO_RULE = "#3b82f6";
const HERO_LABEL = "#1e40af";
const HERO_VALUE = "#1e3a8a";

const TH = `class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid ${COLORS.hairline};`;

function categoryRow(cat: CategorySlice): string {
  return `
          <div style="margin-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td align="left" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">
                  ${cat.name} <span class="txt-muted" style="font-weight:normal;font-size:12px;">(${cat.percentage.toFixed(1)}%)</span>
                </td>
                <td align="right" class="font-sans txt-main" style="font-size:13px;font-weight:600;padding:0;border:none;">
                  ₹${cat.amount.toFixed(2)}
                </td>
              </tr>
            </table>
            <div class="cat-bar-bg"><div class="cat-bar" style="width:${cat.percentage}%"></div></div>
          </div>`;
}

function expenseRow(exp: TopExpense): string {
  return `
              <tr>
                <td align="left" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};">
                  <div class="font-sans txt-main" style="font-weight:600;font-size:13px;">${exp.title}</div>
                  <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${exp.category || "Uncategorized"}</div>
                </td>
                <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:11px;">${exp.date ?? ""}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:12px;font-weight:700;">₹${(exp.amount || 0).toFixed(2)}</td>
              </tr>`;
}

export function expensesPeriodTitle(period: ExpensePeriod): string {
  return period === "monthly" ? "Monthly Expense Summary" : "Weekly Expense Summary";
}

export function buildExpensesEmail(data: ExpensesEmailData): { subject: string; html: string } {
  const periodTitle = expensesPeriodTitle(data.period);

  const body = wrap(`
${header(pill(data.period, COLORS.ink))}${data.isPreview ? previewBanner() : ""}
${title(periodTitle, `Reporting Period: ${data.periodRange}`)}

        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${HERO_BG}!important;background-image:linear-gradient(${HERO_BG},${HERO_BG})!important;border:1px solid ${HERO_BORDER};border-top:3px solid ${HERO_RULE};border-radius:12px;margin-bottom:24px;">
            <tr><td align="center" style="padding:24px;">
              <div class="font-mono" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${HERO_LABEL}!important;-webkit-text-fill-color:${HERO_LABEL}!important;">Total Outflow</div>
              <div class="font-sans" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;color:${HERO_VALUE}!important;-webkit-text-fill-color:${HERO_VALUE}!important;">${inr2(data.totalAmount)}</div>
              <div class="font-sans" style="font-size:13px;font-weight:500;color:${HERO_VALUE}!important;-webkit-text-fill-color:${HERO_VALUE}!important;">
                Average of <strong>₹${data.avgDaily.toFixed(2)}</strong> per day
              </div>
            </td></tr>
          </table>
        </td></tr>
${sectionHeading("Spending by Category")}
        <tr><td class="bento-card" style="padding:24px;">
          ${data.categories.map(categoryRow).join("")}
        </td></tr>
${sectionHeading("Top Outflows", 32)}
        <tr><td class="bento-card" style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr>
              <th align="left" ${TH}">Item / Category</th>
              <th align="right" ${TH}width:80px;">Date</th>
              <th align="right" ${TH}width:100px;">Amount</th>
            </tr></thead>
            <tbody>
              ${data.topExpenses.map(expenseRow).join("")}
            </tbody>
          </table>
        </td></tr>
${footer({
    ctaHref: data.appUrl,
    ctaLabel: "View Ledger",
    note: "This is an automated summary email generated from your dashboard.",
    unsubscribe: data.unsubscribeUrl
      ? { url: data.unsubscribeUrl, label: "Unsubscribe from expense summaries" }
      : undefined,
  })}
  `);

  return {
    subject: `${periodTitle}: ${inr0(data.totalAmount)} spent`,
    html: htmlDoc(periodTitle, body),
  };
}
