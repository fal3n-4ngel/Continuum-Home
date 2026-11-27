import { htmlDoc, wrap, header, footer, title, pill, previewBanner } from "../layout";
import { inr2 } from "../format";
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

const ALERT = "#9E5D48";

function renewalCard(sub: UpcomingRenewal): string {
  return `
            <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:2px solid ${ALERT};margin-bottom:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" valign="middle">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td align="center" valign="middle" style="font-size:24px;width:44px;height:44px;background-color:${COLORS.hairline};border-radius:2px;">
                        ${sub.icon || "💳"}
                      </td>
                      <td valign="middle" style="padding-left:16px;">
                        <div class="font-sans txt-main" style="font-size:15px;font-weight:600;line-height:1.2;">${sub.name}</div>
                        <div class="font-mono txt-warn" style="font-size:9px;font-weight:700;background-color:${COLORS.warnBg}!important;background-image:linear-gradient(${COLORS.warnBg},${COLORS.warnBg})!important;border:1px solid ${COLORS.warnBorder};padding:2px 6px;border-radius:2px;margin-top:6px;display:inline-block;">RENEWING IN ${sub.daysUntil} DAYS</div>
                      </td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <div class="font-sans txt-main" style="font-size:18px;font-weight:700;">${inr2(sub.cost)}</div>
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
    ctaHref: `${data.appUrl.replace(/\/$/, "")}/dashboard?tab=expenses`,
    ctaLabel: "Manage Subscriptions",
    note: "This is an automated renewal reminder from your dashboard.",
    unsubscribe: data.unsubscribeUrl
      ? { url: data.unsubscribeUrl, label: "Unsubscribe from renewal alerts" }
      : undefined,
  })}
  `);

  const names = data.renewals.map((r) => r.name).slice(0, 3).join(", ");
  const preheader = `${data.renewals.length} upcoming renewal${data.renewals.length === 1 ? "" : "s"}${names ? `: ${names}` : ""}`;

  return {
    subject: `Alert: ${data.renewals.length} Upcoming Subscription Renewals`,
    html: htmlDoc("Upcoming Renewals", body, preheader),
  };
}

export interface FamilyMemberSubscriptionEmailData {
  subscription: UpcomingRenewal;
  memberName: string;
  memberShare: number;
  totalMembers: number;
  ownerEmail: string;
  isContinuumUser: boolean;
  appUrl: string;
  unsubscribeUrl?: string;
}

export function buildFamilyMemberSubscriptionEmail(
  data: FamilyMemberSubscriptionEmailData
): { subject: string; html: string } {
  const { subscription: sub, memberName, memberShare, totalMembers, ownerEmail, isContinuumUser } = data;
  const baseUrl = data.appUrl.replace(/\/$/, "");
  const badgeLabel = isContinuumUser ? "Continuum Member" : "Family Plan";
  const badgeColor = isContinuumUser ? COLORS.ink : ALERT;

  const shareCard = `
            <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="border-top:2px solid ${ALERT};margin-bottom:16px;">
              <tr><td style="padding:20px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" valign="middle">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td align="center" valign="middle" style="font-size:24px;width:44px;height:44px;background-color:${COLORS.hairline};border-radius:2px;">
                        ${sub.icon || "💳"}
                      </td>
                      <td valign="middle" style="padding-left:16px;">
                        <div class="font-sans txt-main" style="font-size:15px;font-weight:600;line-height:1.2;">${sub.name}</div>
                        <div class="font-mono txt-warn" style="font-size:9px;font-weight:700;background-color:${COLORS.warnBg}!important;background-image:linear-gradient(${COLORS.warnBg},${COLORS.warnBg})!important;border:1px solid ${COLORS.warnBorder};padding:2px 6px;border-radius:2px;margin-top:6px;display:inline-block;">RENEWING IN ${sub.daysUntil} DAYS</div>
                      </td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <div class="font-mono txt-muted" style="font-size:9px;text-transform:uppercase;letter-spacing:0.6px;">Your Share</div>
                    <div class="font-sans txt-main" style="font-size:20px;font-weight:700;margin-top:2px;">${inr2(memberShare)}</div>
                    <div class="font-sans txt-muted" style="font-size:11px;font-weight:500;margin-top:4px;">Total ${inr2(sub.cost)} / ${totalMembers} • ${sub.nextBillingDate}</div>
                  </td>
                </tr></table>
              </td></tr>
            </table>`;

  const continuumPerkBox = isContinuumUser
    ? `
            <table width="100%" class="bento-card" cellpadding="0" cellspacing="0" style="background-color:${COLORS.canvas};margin-bottom:16px;">
              <tr><td style="padding:14px 18px;">
                <div class="font-mono txt-main" style="font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Visible in Your Continuum App</div>
                <p class="font-sans txt-muted" style="font-size:12px;margin:6px 0 0 0;line-height:1.5;">
                  You can also view this plan under <strong>Subscriptions → Shared With You</strong> in Continuum Home and log your ${inr2(memberShare)} payment in 1 click after paying ${ownerEmail}.
                </p>
              </td></tr>
            </table>`
    : `
            <p class="font-sans txt-muted" style="font-size:11px;margin:4px 0 12px 0;line-height:1.5;text-align:center;">
              Want to track your own shared bills &amp; renewals? <a href="${baseUrl}" style="color:${COLORS.ink};text-decoration:underline;">Continuum Home</a> is a free, encrypted personal finance dashboard.
            </p>`;

  const body = wrap(`
${header(pill(badgeLabel, badgeColor))}
${title(
    `${sub.name} — Payment Reminder`,
    `Hi ${memberName}, ${sub.name} (${sub.billingCycle}) renews in ${sub.daysUntil} days. Your share is ${inr2(memberShare)} — please pay ${ownerEmail} before ${sub.nextBillingDate}.`
  )}
        <tr><td>
          ${shareCard}
          ${continuumPerkBox}
        </td></tr>
${footer({
    ctaHref: isContinuumUser ? `${baseUrl}/dashboard?tab=expenses` : baseUrl,
    ctaLabel: isContinuumUser ? "View in Subscriptions & Log Payment" : "Learn About Continuum Home",
    note: `Automated payment reminder sent on behalf of ${ownerEmail}.`,
    unsubscribe: data.unsubscribeUrl
      ? { url: data.unsubscribeUrl, label: isContinuumUser ? "Unsubscribe from subscription alerts" : "Unsubscribe from these reminders" }
      : undefined,
  })}
  `);

  const preheader = `Reminder: pay ${ownerEmail} ${inr2(memberShare)} for ${sub.name} (renews in ${sub.daysUntil} days).`;

  return {
    subject: `Payment Reminder: ${sub.name} (${inr2(memberShare)}) due to ${ownerEmail}`,
    html: htmlDoc(`${sub.name} Payment Reminder`, body, preheader),
  };
}
