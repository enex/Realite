/**
 * Liest die erste URL aus einem Text (z. B. Event-Beschreibung) und ermittelt
 * das Open-Graph-Bild (og:image) für Link-Previews.
 * Nur URLs, die beim Abruf ein gültiges Bild liefern und nicht auf der Blocklist stehen, werden zurückgegeben.
 */

const URL_REGEX =
  /https?:\/\/[^\s<>[\]()'"\u201C\u201D\u2018\u2019]+/gi;

const OG_IMAGE_PATTERNS = [
  /<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/gi,
  /<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["'][^>]*>/gi,
];

const FETCH_TIMEOUT_MS = 6000;
const MAX_BODY_LENGTH = 400_000;
const IMAGE_VALIDATE_TIMEOUT_MS = 5000;

/** Hosts, die og:image-URLs liefern, aber direkten Abruf blockieren (z. B. 403). */
const BLOCKED_IMAGE_HOSTS = new Set([
  "lookaside.fbsbx.com", // Meta CDN nur für Crawler, kein direkter Zugriff
]);

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

function isBlockedImageHost(imageUrl: string): boolean {
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return BLOCKED_IMAGE_HOSTS.has(host);
  } catch {
    return true;
  }
}

/**
 * Prüft per HEAD, ob die URL ein abrufbares Bild liefert (Status 200, Content-Type image/*).
 */
async function validateImageUrl(imageUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_VALIDATE_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Realite/1.0 (Link preview; +https://realite.app)",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type")?.toLowerCase().trim() ?? "";
    return ct.startsWith("image/");
  } catch {
    clearTimeout(timeout);
    return false;
  }
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
    const imageUrl =
      html.length > MAX_BODY_LENGTH
        ? resolveOgImageUrl(html.slice(0, MAX_BODY_LENGTH), url)
        : resolveOgImageUrl(html, url);

    if (!imageUrl) return null;
    if (isBlockedImageHost(imageUrl)) return null;
    if (!(await validateImageUrl(imageUrl))) return null;

    return imageUrl;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
