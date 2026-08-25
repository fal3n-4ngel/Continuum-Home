import { htmlDoc, wrap, header, footer, title, pill, previewBanner } from "../layout";
import { COLORS } from "../theme";

export interface UpcomingRenewal {
  name: string;
  icon: string | null;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  daysUntil: number;
}

export interface SubscriptionsEmailData {
  renewals: UpcomingRenewal[];
  appUrl: string;
  unsubscribeUrl?: string;
  isPreview?: boolean;
}

const ALERT = "#b45309";

function renewalCard(sub: UpcomingRenewal): string {
  return `
            <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:2px solid ${ALERT};margin-bottom:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" valign="middle">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td align="center" valign="middle" style="font-size:24px;width:44px;height:44px;background-color:${COLORS.hairline};border-radius:8px;">
                        ${sub.icon || "💳"}
                      </td>
                      <td valign="middle" style="padding-left:16px;">
                        <div class="font-sans txt-main" style="font-size:15px;font-weight:600;line-height:1.2;">${sub.name}</div>
                        <div class="font-mono txt-warn" style="font-size:9px;font-weight:700;background-color:${COLORS.warnBg}!important;background-image:linear-gradient(${COLORS.warnBg},${COLORS.warnBg})!important;padding:3px 6px;border-radius:4px;margin-top:6px;display:inline-block;">RENEWING IN ${sub.daysUntil} DAYS</div>
                      </td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <div class="font-sans txt-main" style="font-size:18px;font-weight:700;">₹${sub.cost.toFixed(2)}</div>
                    <div class="font-sans txt-muted" style="font-size:11px;font-weight:500;margin-top:4px;">${sub.billingCycle === "yearly" ? "Yearly" : "Monthly"} • ${sub.nextBillingDate}</div>
                  </td>
                </tr></table>
              </td></tr>
            </table>`;
}

export function buildSubscriptionsEmail(data: SubscriptionsEmailData): { subject: string; html: string } {
  const body = wrap(`
${header(pill("Alert", ALERT))}${data.isPreview ? previewBanner() : ""}
${title("Upcoming Subscription Renewals", "Heads up! The following subscriptions are renewing in the next 2–3 days.")}

        <tr><td>
          ${data.renewals.map(renewalCard).join("")}
        </td></tr>
${footer({
    ctaHref: data.appUrl,
    ctaLabel: "Manage Subscriptions",
    note: "This is an automated security alert from your dashboard.",
    unsubscribe: data.unsubscribeUrl
      ? { url: data.unsubscribeUrl, label: "Unsubscribe from renewal alerts" }
      : undefined,
  })}
  `);

  return {
    subject: `Alert: ${data.renewals.length} Upcoming Subscription Renewals`,
    html: htmlDoc("Upcoming Renewals", body),
  };
}
