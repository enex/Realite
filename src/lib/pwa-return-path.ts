export const PWA_RETURN_PATH_COOKIE = "realite-pwa-return-path";
export const PWA_RETURN_PATH_MAX_AGE_SECONDS = 10 * 60;

const SAFE_RETURN_ORIGIN = "https://realite.app";

export function getSafePwaReturnPath(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw, SAFE_RETURN_ORIGIN);
    if (url.origin !== SAFE_RETURN_ORIGIN) return null;
    if (!url.pathname.startsWith("/")) return null;
    if (url.pathname === "/start") return null;
    if (url.pathname.startsWith("/api/")) return null;
    if (url.pathname.startsWith("/_next/")) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
