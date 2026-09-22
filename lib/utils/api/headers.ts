import { safeLocalStorage } from "../storage";

export function getAuthHeaders(idToken?: string): Record<string, string> {
  const embeddedToken = safeLocalStorage.getItem("phub_embedded_token");
  const token = (idToken && idToken !== "embedded_token") ? idToken : (embeddedToken || "");
  return {
    "Content-Type": "application/json",
    "X-Client": "web",
    Authorization: `Bearer ${token}`,
  };
}

