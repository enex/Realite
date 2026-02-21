const ALLOWED_TAGS = new Set(["a", "b", "br", "em", "i", "li", "ol", "p", "strong", "u", "ul"]);
const SELF_CLOSING_TAGS = new Set(["br"]);
const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sanitizeHref(rawHref: string | null) {
  if (!rawHref) {
    return null;
  }

  const href = rawHref.trim();
  if (!href) {
    return null;
  }

  if (href.startsWith("/") || href.startsWith("#")) {
    return href;
  }

  if (href.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(href);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }

    return href;
  } catch {
    return null;
  }
}

function extractHref(rawAttributes: string) {
  const attributeMatch = rawAttributes.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu);
  if (!attributeMatch) {
    return null;
  }

  return attributeMatch[1] ?? attributeMatch[2] ?? attributeMatch[3] ?? null;
}

export function sanitizeBasicHtml(rawHtml: string) {
  const input = rawHtml.trim();
  if (!input) {
    return "";
  }

  const tagRegex = /<\/?([a-z0-9]+)([^>]*)>/giu;
  const openTags: string[] = [];
  let output = "";
  let cursor = 0;

  for (const match of input.matchAll(tagRegex)) {
    const matchText = match[0];
    const tagName = (match[1] ?? "").toLowerCase();
    const rawAttributes = match[2] ?? "";
    const matchIndex = match.index ?? 0;
    const isClosingTag = matchText.startsWith("</");

    output += escapeHtml(input.slice(cursor, matchIndex));
    cursor = matchIndex + matchText.length;

    if (!ALLOWED_TAGS.has(tagName)) {
      continue;
    }

    if (isClosingTag) {
      if (SELF_CLOSING_TAGS.has(tagName)) {
        continue;
      }

      const topTag = openTags[openTags.length - 1];
      if (topTag !== tagName) {
        continue;
      }

      openTags.pop();
      output += `</${tagName}>`;
      continue;
    }

    if (SELF_CLOSING_TAGS.has(tagName)) {
      output += "<br />";
      continue;
    }

    if (tagName === "a") {
      const href = sanitizeHref(extractHref(rawAttributes));
      if (!href) {
        continue;
      }

      const isExternal = /^https?:\/\//iu.test(href);
      const target = isExternal ? ' target="_blank"' : "";
      const rel = isExternal ? ' rel="noopener noreferrer nofollow"' : "";

      output += `<a href="${escapeAttribute(href)}"${target}${rel}>`;
      openTags.push(tagName);
      continue;
    }

    output += `<${tagName}>`;
    openTags.push(tagName);
  }

  output += escapeHtml(input.slice(cursor));

  while (openTags.length > 0) {
    const tagName = openTags.pop();
    if (tagName) {
      output += `</${tagName}>`;
    }
  }

  return output;
}
