export function getAuthHeaders(idToken?: string): Record<string, string> {
  const embeddedToken = typeof window !== "undefined" ? localStorage.getItem("phub_embedded_token") : null;
  const token = (idToken && idToken !== "embedded_token") ? idToken : (embeddedToken || "");
  return {
    "Content-Type": "application/json",
    "X-Client": "web",
    Authorization: `Bearer ${token}`,
  };
}

