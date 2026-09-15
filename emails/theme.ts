
export const EMAIL_CSS = `
    :root { color-scheme: light; supported-color-schemes: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #F3EFEA !important; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; border-spacing: 0; }
    .txt-main       { color: #26211F !important; -webkit-text-fill-color: #26211F !important; }
    .txt-muted      { color: #6D635C !important; -webkit-text-fill-color: #6D635C !important; }
    .txt-terracotta { color: #9E5D48 !important; -webkit-text-fill-color: #9E5D48 !important; }
    .txt-ochre      { color: #D99419 !important; -webkit-text-fill-color: #D99419 !important; }
    .txt-green      { color: #16a34a !important; -webkit-text-fill-color: #16a34a !important; }
    .txt-red        { color: #dc2626 !important; -webkit-text-fill-color: #dc2626 !important; }
    .txt-white      { color: #FAF8F5 !important; -webkit-text-fill-color: #FAF8F5 !important; }
    .txt-warn       { color: #8A5410 !important; -webkit-text-fill-color: #8A5410 !important; }
    .font-sans      { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .font-serif     { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .font-mono      { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .bento-card {
      background-color: #FAF8F5 !important;
      background-image: linear-gradient(#FAF8F5, #FAF8F5) !important;
      border: 1px solid #DDD5CB;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(38,33,31,0.03);
    }
    .btn-primary {
      display: inline-block;
      background-color: #9E5D48 !important;
      background-image: linear-gradient(#9E5D48, #9E5D48) !important;
      color: #FAF8F5 !important; -webkit-text-fill-color: #FAF8F5 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px;
      text-decoration: none; padding: 11px 22px; border-radius: 2px;
    }
    .cat-bar-bg {
      height: 6px;
      background-color: #EAE4DB !important;
      background-image: linear-gradient(#EAE4DB, #EAE4DB) !important;
      border-radius: 2px; overflow: hidden;
    }
    .cat-bar {
      height: 100%;
      background-color: #9E5D48 !important;
      background-image: linear-gradient(#9E5D48, #9E5D48) !important;
      border-radius: 2px;
    }`;

export const COLORS = {
  canvas: "#F3EFEA",
  card: "#FAF8F5",
  ink: "#26211F",
  muted: "#6D635C",
  hairline: "#DDD5CB",
  terracotta: "#9E5D48",
  ochre: "#D99419",
  positive: "#16a34a",
  negative: "#dc2626",
  warnBg: "#FBF3E8",
  warnBorder: "#E8CD9E",
  warnInk: "#8A5410",
} as const;
