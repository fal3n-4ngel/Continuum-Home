import { NextRequest, NextResponse } from "next/server";
import { adminSetEmailSubscriptions, type EmailSubscriptions } from "@/lib/firebase-admin";
import { EMAIL_CATEGORIES, EMAIL_CATEGORY_LABELS, verifyUnsubscribeToken, type EmailCategory, type UnsubscribeCategory } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

const SHARED_STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background-color: #f4f3ec; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1b18; }
  .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 420px; background-color: #fcfbfa; border: 1px solid #eae8e0; border-radius: 14px; box-shadow: 0 2px 10px rgba(28,27,24,0.04); padding: 32px 28px; text-align: center; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-weight: normal; font-size: 24px; margin: 0 0 12px 0; line-height: 1.3; }
  p { font-size: 13.5px; line-height: 1.6; color: #7c7a72; margin: 0 0 24px 0; }
  .cat { font-weight: 600; color: #1c1b18; }
  button, .btn { display: inline-block; width: 100%; background-color: #1c1b18; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 13px 24px; border-radius: 8px; border: none; cursor: pointer; }
  .btn-secondary { background-color: transparent; color: #7c7a72; margin-top: 12px; font-weight: 500; font-size: 12.5px; }
  .icon { font-size: 28px; margin-bottom: 12px; }
  @media (max-width: 400px) { .card { padding: 26px 20px; } h1 { font-size: 21px; } }
`;

function page(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${SHARED_STYLE}</style>
</head>
<body>
  <div class="wrap"><div class="card">${body}</div></div>
</body>
</html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function errorPage(message: string): NextResponse {
  return page(
    "Unsubscribe — Continuum Home",
    `<div class="icon">⚠️</div><h1>Link invalid</h1><p>${message}</p>`,
    400
  );
}

function parseParams(req: NextRequest): { uid: string; category: UnsubscribeCategory; token: string } | null {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid") || "";
  const category = searchParams.get("category") || "";
  const token = searchParams.get("token") || "";
  const validCategory = category === "all" || EMAIL_CATEGORIES.includes(category as EmailCategory);
  if (!uid || !token || !validCategory) return null;
  return { uid, category: category as UnsubscribeCategory, token };
}

function categoryLabel(category: UnsubscribeCategory): string {
  return category === "all" ? "all Continuum Home emails" : EMAIL_CATEGORY_LABELS[category];
}

function updatesFor(category: UnsubscribeCategory): Partial<EmailSubscriptions> {
  if (category === "all") return { expenses: false, portfolio: false, subscriptions: false };
  return { [category]: false };
}

export async function GET(req: NextRequest) {
  const parsed = parseParams(req);
  if (!parsed || !verifyUnsubscribeToken(parsed.uid, parsed.token)) {
    return errorPage("This unsubscribe link is malformed or has expired. If you still want to stop these emails, sign in and use the Settings page instead.");
  }

  return page(
    "Unsubscribe — Continuum Home",
    `<h1>Unsubscribe?</h1>
     <p>Stop receiving <span class="cat">${categoryLabel(parsed.category)}</span> from Continuum Home. You can turn this back on anytime from Settings.</p>
     <form method="POST">
       <button type="submit">Confirm Unsubscribe</button>
     </form>`
  );
}

export async function POST(req: NextRequest) {
  const parsed = parseParams(req);
  if (!parsed || !verifyUnsubscribeToken(parsed.uid, parsed.token)) {
    return errorPage("This unsubscribe link is malformed or has expired. If you still want to stop these emails, sign in and use the Settings page instead.");
  }

  try {
    await adminSetEmailSubscriptions(parsed.uid, updatesFor(parsed.category));
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    return page(
      "Unsubscribe — Continuum Home",
      `<div class="icon">⚠️</div><h1>Something went wrong</h1><p>We couldn't process your request. Please try again in a moment.</p>`,
      500
    );
  }

  return page(
    "Unsubscribed — Continuum Home",
    `<div class="icon">✓</div><h1>You're unsubscribed</h1>
     <p>You won't receive <span class="cat">${categoryLabel(parsed.category)}</span> anymore. Changed your mind? Sign in and re-enable it from Settings anytime.</p>
     <a class="btn" href="${process.env.APP_URL || "http://localhost:3000"}/?tab=settings">Manage Email Preferences</a>`
  );
}
