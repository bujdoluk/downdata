function getAuthCookiePrefix(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}

// Drops Max-Age/Expires so the auth cookies die with the browser, not at JWT expiry.
export function forgetSessionOnBrowserClose() {
  if (typeof document === "undefined") return;
  const prefix = getAuthCookiePrefix();
  if (!prefix) return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  for (const entry of document.cookie.split("; ")) {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = entry.slice(0, separatorIndex);
    if (name !== prefix && !name.startsWith(`${prefix}.`)) continue;
    const value = entry.slice(separatorIndex + 1);
    document.cookie = `${name}=${value}; path=/; SameSite=Lax${secure}`;
  }
}
