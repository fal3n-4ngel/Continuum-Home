// Document shell, body table, masthead and footer. Templates supply only
// their own content rows.

import { EMAIL_CSS, COLORS } from "./theme";

export interface FooterOptions {
  ctaHref: string;
  ctaLabel: string;
  /** Small print above the unsubscribe line. May contain inline HTML. */
  note: string;
  /** Omitted for transactional mail, which has no subscription to leave. */
  unsubscribe?: { url: string; label: string };
}

export function htmlDoc(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <meta charset="utf-8">
  <title>${title}</title>
  <style>${EMAIL_CSS}</style>
</head>
<body class="font-sans" style="background-color:${COLORS.canvas};margin:0;padding:0;">
  ${body}
</body>
</html>`;
}

export function wrap(bodyRows: string, maxWidth = 680): string {
  return `
  <table width="100%" bgcolor="${COLORS.canvas}" cellpadding="0" cellspacing="0" style="background-color:${COLORS.canvas};background-image:linear-gradient(${COLORS.canvas},${COLORS.canvas})!important;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="100%" style="max-width:${maxWidth}px;" cellpadding="0" cellspacing="0">
        ${bodyRows}
      </table>
    </td></tr>
  </table>`;
}

export function header(rightHtml: string): string {
  return `
          <tr>
            <td style="border-bottom:1px solid ${COLORS.hairline};padding-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td align="left" class="txt-main font-sans" style="font-size:16px;font-weight:500;">Continuum Home</td>
                <td align="right">${rightHtml}</td>
              </tr></table>
            </td>
          </tr>
          <tr><td height="32"></td></tr>`;
}

export function pill(label: string, bg: string): string {
  return `<span class="font-sans txt-white" style="font-size:9px;font-weight:700;background-color:${bg};background-image:linear-gradient(${bg},${bg});padding:4px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>`;
}

export function dateStamp(text: string): string {
  return `<span class="txt-muted font-sans" style="font-size:12px;">${text}</span>`;
}

/** Marks an email as sample data, so a preview is never mistaken for a real report. */
export function previewBanner(): string {
  return `
          <tr><td style="background-color:${COLORS.warnBg};background-image:linear-gradient(${COLORS.warnBg},${COLORS.warnBg});border:1px solid ${COLORS.warnBorder};border-radius:8px;padding:10px 16px;">
            <span style="font-size:11px;font-weight:700;color:${COLORS.warnInk};font-family:ui-monospace,monospace;">⚡ EMAIL PREVIEW — Sample data only. Not your real data.</span>
          </td></tr>
          <tr><td height="24"></td></tr>`;
}

export function footer({ ctaHref, ctaLabel, note, unsubscribe }: FooterOptions): string {
  const unsubRow = unsubscribe
    ? `
              <p class="font-sans txt-muted" style="font-size:11px;margin-top:8px;"><a href="${unsubscribe.url}" style="color:${COLORS.muted};text-decoration:underline;">${unsubscribe.label}</a></p>`
    : "";

  return `
          <tr>
            <td align="center" style="padding:48px 0 24px 0;border-top:1px solid ${COLORS.hairline};display:block;">
              <a href="${ctaHref}" class="btn-primary font-sans">${ctaLabel}</a>
              <p class="font-sans txt-muted" style="font-size:11px;margin-top:16px;">${note}</p>${unsubRow}
            </td>
          </tr>`;
}

export function sectionHeading(text: string, marginTop = 16): string {
  return `
        <tr><td align="left">
          <h2 class="font-serif txt-main" style="font-size:22px;font-weight:normal;margin:${marginTop}px 0 16px 0;">${text}</h2>
        </td></tr>`;
}

export function title(heading: string, subtitle: string): string {
  return `
        <tr><td align="left">
          <h1 class="font-serif txt-main" style="font-size:32px;font-weight:normal;margin:0 0 4px 0;letter-spacing:0.5px;">${heading}</h1>
          <p class="font-sans txt-muted" style="font-size:13px;margin:0 0 24px 0;">${subtitle}</p>
        </td></tr>`;
}
