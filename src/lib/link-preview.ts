/**
 * Liest die erste URL aus einem Text (z. B. Event-Beschreibung) und ermittelt
 * das Open-Graph-Bild (og:image) für Link-Previews.
 */

const URL_REGEX =
  /https?:\/\/[^\s<>[\]()'"\u201C\u201D\u2018\u2019]+/gi;

const OG_IMAGE_PATTERNS = [
  /<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/gi,
  /<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["'][^>]*>/gi,
];

const FETCH_TIMEOUT_MS = 6000;
const MAX_BODY_LENGTH = 400_000;

function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== "string") {
    return null;
  }
  const match = text.trim().match(URL_REGEX);
  if (!match?.[0]) {
    return null;
  }
  const raw = match[0];
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}

function resolveOgImageUrl(html: string, pageUrl: string): string | null {
  const base = new URL(pageUrl);
  for (const pattern of OG_IMAGE_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const value = m[1]?.trim();
      if (!value) continue;
      try {
        const resolved = new URL(value, base.origin);
        if (
          resolved.protocol === "http:" ||
          resolved.protocol === "https:"
        ) {
          return resolved.href;
        }
      } catch {
        // skip invalid URL
      }
    }
  }
  return null;
}

/**
 * Holt das og:image der ersten in `text` vorkommenden URL.
 * Timeout und Größenlimit werden angewendet; bei Fehlern wird null zurückgegeben.
 */
export async function fetchOgImageFromText(
  text: string,
): Promise<string | null> {
  const url = extractFirstUrl(text);
  if (!url) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Realite/1.0 (Link preview; +https://realite.app)",
      },
    });
    clearTimeout(timeout);
    if (!res.ok || !res.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return null;
    }
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_LENGTH) {
      return null;
    }
    const html = await res.text();
    if (html.length > MAX_BODY_LENGTH) {
      return resolveOgImageUrl(html.slice(0, MAX_BODY_LENGTH), url);
    }
    return resolveOgImageUrl(html, url);
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
