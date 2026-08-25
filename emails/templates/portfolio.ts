import { htmlDoc, wrap, header, footer, title, sectionHeading, dateStamp, previewBanner } from "../layout";
import { inr0, inr2, delta, pct, toneClass } from "../format";
import { COLORS } from "../theme";

export interface PortfolioHolding {
  name: string;
  category: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioEmailData {
  todayStr: string;
  totalCurrent: number;
  totalInvested: number;
  overallPnl: number;
  overallPnlPercent: number;
  dailyChange: number;
  weeklyChange: number;
  holdings: PortfolioHolding[];
  usdToInr: number;
  appUrl: string;
  unsubscribeUrl?: string;
  /** Renders the sample-data banner. Admin preview only. */
  isPreview?: boolean;
}

function statTile(label: string, valueHtml: string): string {
  return `
            <td width="31%" class="bento-card" align="center" valign="middle" style="padding:20px;">
              <div class="font-mono txt-muted" style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${label}</div>
              <div style="font-size:20px;font-weight:bold;margin-top:6px;">${valueHtml}</div>
            </td>`;
}

function holdingRow(a: PortfolioHolding): string {
  return `<tr>
                <td align="left" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};">
                  <div class="font-sans txt-main" style="font-weight:600;font-size:12px;">${a.name}</div>
                  <div class="font-mono txt-muted" style="font-size:9px;margin-top:4px;text-transform:uppercase;">${a.category}</div>
                </td>
                <td align="right" class="font-mono txt-muted" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:11px;">${a.quantity.toLocaleString("en-IN")}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:11px;">₹${a.currentPrice.toFixed(2)}</td>
                <td align="right" class="font-mono txt-main" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:11px;font-weight:600;">₹${a.currentValue.toFixed(2)}</td>
                <td align="right" class="font-mono ${toneClass(a.pnl)}" style="padding:14px 0;border-bottom:1px solid ${COLORS.canvas};font-size:11px;font-weight:600;">
                  ${a.pnl >= 0 ? "+" : ""}₹${a.pnl.toFixed(0)}
                  <div class="txt-muted" style="font-size:9px;font-weight:normal;margin-top:3px;">(${pct(a.pnlPercent, 1)})</div>
                </td>
              </tr>`;
}

const TH = `class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;padding-bottom:12px;border-bottom:1px solid ${COLORS.hairline};"`;

export function buildPortfolioEmail(data: PortfolioEmailData): { subject: string; html: string } {
  const isGreen = data.overallPnl >= 0;

  const body = wrap(`
${header(dateStamp(data.todayStr))}${data.isPreview ? previewBanner() : ""}
${title("Daily Portfolio Close", "Indian Market Close Wrap-Up (5:30 PM IST)")}

        <tr><td>
          <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:3px solid ${isGreen ? COLORS.positive : COLORS.negative};margin-bottom:16px;">
            <tr><td align="center" style="padding:24px;">
              <div class="font-mono txt-muted" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Net Asset Valuation</div>
              <div class="font-sans txt-main" style="font-size:36px;font-weight:bold;margin:8px 0;letter-spacing:-1px;">${inr2(data.totalCurrent)}</div>
              <div class="font-sans ${toneClass(data.overallPnl)}" style="font-size:14px;font-weight:700;">
                ${delta(data.overallPnl, { paise: true })} (${pct(data.overallPnlPercent)})
              </div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
${statTile("Invested Capital", `<span class="font-sans txt-main">${inr0(data.totalInvested)}</span>`)}
            <td width="3.5%"></td>
${statTile("Today's P&amp;L (1D)", `<span class="font-sans ${toneClass(data.dailyChange)}">${delta(data.dailyChange)}</span>`)}
            <td width="3.5%"></td>
${statTile("7-Day Change (1W)", `<span class="font-sans ${toneClass(data.weeklyChange)}">${delta(data.weeklyChange)}</span>`)}
          </tr></table>
        </td></tr>
${sectionHeading("Active Holdings Ledger")}
        <tr><td class="bento-card" style="padding:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr>
              <th align="left" ${TH}>Asset / Class</th>
              <th align="right" ${TH}>Qty</th>
              <th align="right" ${TH}>CMP</th>
              <th align="right" ${TH}>Value</th>
              <th align="right" ${TH}>P&amp;L</th>
            </tr></thead>
            <tbody>
              ${data.holdings.map(holdingRow).join("")}
            </tbody>
          </table>
        </td></tr>
${footer({
    ctaHref: data.appUrl,
    ctaLabel: "Open Personal Dashboard",
    note: `Automated daily wrap-up from your dashboard.<br>USD to INR Rate: ₹${data.usdToInr.toFixed(2)}`,
    unsubscribe: data.unsubscribeUrl
      ? { url: data.unsubscribeUrl, label: "Unsubscribe from portfolio updates" }
      : undefined,
  })}
  `);

  return {
    subject: `Daily Portfolio Close: ${inr0(data.totalCurrent)} (${data.overallPnlPercent >= 0 ? "+" : ""}${pct(data.overallPnlPercent, 1)})`,
    html: htmlDoc("Daily Portfolio Close", body),
  };
}
