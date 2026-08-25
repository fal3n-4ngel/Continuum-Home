// Single source of truth for email CSS, shared by the crons and the admin
// preview. Two defensive quirks are deliberate:
//   `-webkit-text-fill-color` alongside `color`, because iOS Mail and Gmail
//   dark mode override plain colour; and `linear-gradient(X, X)` alongside
//   `background-color`, because those clients repaint flat backgrounds but
//   leave gradients alone. Both gradients are solid colours by design.

export const EMAIL_CSS = `
    :root { color-scheme: light; supported-color-schemes: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f3ec !important; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; border-spacing: 0; }
    .txt-main  { color: #1c1b18 !important; -webkit-text-fill-color: #1c1b18 !important; }
    .txt-muted { color: #7c7a72 !important; -webkit-text-fill-color: #7c7a72 !important; }
    .txt-green { color: #16a34a !important; -webkit-text-fill-color: #16a34a !important; }
    .txt-red   { color: #dc2626 !important; -webkit-text-fill-color: #dc2626 !important; }
    .txt-white { color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; }
    .txt-warn  { color: #b45309 !important; -webkit-text-fill-color: #b45309 !important; }
    .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .font-serif { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .font-mono  { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bento-card {
      background-color: #fcfbfa !important;
      background-image: linear-gradient(#fcfbfa, #fcfbfa) !important;
      border: 1px solid #eae8e0;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(28,27,24,0.02);
    }
    .btn-primary {
      display: inline-block;
      background-color: #1c1b18 !important;
      background-image: linear-gradient(#1c1b18, #1c1b18) !important;
      color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;
      font-size: 13px; font-weight: 600;
      text-decoration: none; padding: 12px 24px; border-radius: 6px;
    }
    .cat-bar-bg {
      height: 6px;
      background-color: #e5e5e5 !important;
      background-image: linear-gradient(#e5e5e5,#e5e5e5) !important;
      border-radius: 3px; overflow: hidden;
    }
    .cat-bar {
      height: 100%;
      background-color: #1c1b18 !important;
      background-image: linear-gradient(#1c1b18,#1c1b18) !important;
      border-radius: 3px;
    }`;

export const COLORS = {
  canvas: "#f4f3ec",
  ink: "#1c1b18",
  muted: "#7c7a72",
  hairline: "#eae8e0",
  positive: "#22c55e",
  negative: "#ef4444",
  warnBg: "#fef3c7",
  warnBorder: "#fde68a",
  warnInk: "#92400e",
} as const;
