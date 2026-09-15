import { htmlDoc, wrap } from "../layout";
import { COLORS } from "../theme";

export interface AnnouncementEmailData {
  subject: string;
  title: string;
  content: string;
  appUrl: string;
  isPreview?: boolean;
}

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function buildAnnouncementEmail(data: AnnouncementEmailData): { subject: string; html: string } {
  const previewNotice = data.isPreview
    ? `
      <tr><td style="padding-bottom: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.warnBg}; border: 1px solid ${COLORS.warnBorder}; border-radius: 8px;">
          <tr><td style="padding: 10px 16px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; color: ${COLORS.warnInk};">
            ⚡ ANNOUNCEMENT PREVIEW — Sent to administrative inbox only.
          </td></tr>
        </table>
      </td></tr>`
    : "";

  const body = wrap(
    `${previewNotice}
      <tr><td>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.card}; border: 1px solid ${COLORS.hairline}; border-radius: 4px; box-shadow: 0 1px 3px rgba(38,27,24,0.03);">
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-bottom: 1px solid ${COLORS.hairline}; padding-bottom: 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td align="left" style="font-family: ${SANS}; font-size: 14px; font-weight: 700; color: ${COLORS.ink};">
                      <span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:700;color:${COLORS.terracotta};margin-right:6px;">⌜</span>Continuum<span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:700;color:${COLORS.terracotta};margin-left:6px;">⌟</span>
                    </td>
                    <td align="right" style="font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: ${COLORS.muted};">Announcement</td>
                  </tr></table>
                </td></tr>

                <tr><td height="28"></td></tr>

                <tr><td align="left">
                  <h1 style="font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 26px; font-weight: normal; margin: 0 0 16px 0; line-height: 1.3; color: ${COLORS.ink};">${data.title}</h1>
                  <div style="font-family: ${SANS}; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: ${COLORS.ink};">${data.content}</div>
                </td></tr>

                <tr><td height="32"></td></tr>

                <tr><td align="center" style="border-top: 1px solid ${COLORS.hairline}; padding-top: 24px;">
                  <a href="${data.appUrl}" style="display: inline-block; background-color: ${COLORS.terracotta}; color: #FAF8F5; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 11px 22px; border-radius: 2px;">Open Dashboard</a>
                  <p style="font-family: ${SANS}; font-size: 11px; margin-top: 16px; color: ${COLORS.muted};">Continuum — steady flow of life progression.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>`,
    600
  );

  return {
    subject: data.isPreview ? `[ANNOUNCEMENT PREVIEW] ${data.subject}` : data.subject,
    html: htmlDoc(data.subject, body),
  };
}
