export const AUTH_COOKIE_NAME = "continuum_logged_in";
export const AUTH_STORAGE_KEY = "continuum_logged_in";

export function setClientAuthSession() {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `${AUTH_COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
  } catch {}
}

export function clearClientAuthSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

export function isClientAuthSessionPresent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(AUTH_STORAGE_KEY) === "1" ||
      document.cookie.split("; ").some((c) => c.startsWith(`${AUTH_COOKIE_NAME}=1`))
    );
  } catch {
    return false;
  }
}
