export function friendlyAuthErrorMessage(e: { code?: string; message?: string }): string {
  switch (e.code) {
    case "auth/popup-blocked":
    case "auth/operation-not-supported-in-this-environment":
      return "Your browser (or an extension like an ad blocker) blocked the sign-in popup, and the redirect fallback didn't complete either. Try disabling ad-blocking/privacy extensions for this site, or allow popups, then try again.";
    case "auth/network-request-failed":
      return "The sign-in request was blocked or failed to reach Google — this can happen with ad blockers or strict privacy extensions. Try disabling them for this site and sign in again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was closed before it finished. Please try again.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized for sign-in yet. If you're self-hosting, add it under Firebase Console → Authentication → Settings → Authorized domains.";
    default:
      return e.message || "Sign-in failed. Please try again.";
  }
}

export const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/network-request-failed",
]);
