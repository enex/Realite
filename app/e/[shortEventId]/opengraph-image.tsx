import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  EVENT_SHARE_FALLBACK_DESCRIPTION,
  EVENT_SHARE_FALLBACK_TITLE,
  formatEventShareOwner,
  formatEventShareSchedule,
  getEventShareCopy,
  getPublicEventSharePreviewByShortId
} from "@/src/lib/event-share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Event auf Realite";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/svg+xml";

let appIconDataUriPromise: Promise<string | null> | null = null;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapText(value: string, maxCharsPerLine: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) {
        return lines;
      }
    }

    current = word;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const totalWords = lines.join(" ").split(/\s+/).length;
    if (totalWords < words.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxCharsPerLine - 3)).trimEnd()}...`;
    }
  }

  return lines;
}

async function getAppIconDataUri() {
  if (!appIconDataUriPromise) {
    appIconDataUriPromise = readFile(path.join(process.cwd(), "public", "icon-192.png"))
      .then((buffer) => `data:image/png;base64,${buffer.toString("base64")}`)
      .catch(() => null);
  }

  return appIconDataUriPromise;
}

export default async function EventOgImage({
  params
}: {
  params: Promise<{ shortEventId: string }>;
}) {
  const { shortEventId } = await params;
  const preview = await getPublicEventSharePreviewByShortId(shortEventId);
  const copy = getEventShareCopy(preview);
  const schedule = preview ? formatEventShareSchedule(preview) : EVENT_SHARE_FALLBACK_DESCRIPTION;
  const owner = preview ? formatEventShareOwner(preview) : "";
  const title = preview ? copy.title : EVENT_SHARE_FALLBACK_TITLE;
  const titleLines = wrapText(title, 28, 3);
  const appIconDataUri = await getAppIconDataUri();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbf8f2"/>
      <stop offset="40%" stop-color="#f5f1e8"/>
      <stop offset="100%" stop-color="#e7dfcf"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${
    appIconDataUri
      ? `<image x="56" y="44" width="64" height="64" href="${appIconDataUri}"/>`
      : '<rect x="56" y="44" rx="12" ry="12" width="64" height="64" fill="#2f5d50"/>'
  }
  <text x="132" y="86" font-size="34" font-weight="700" fill="#1e3a34" font-family="Arial, sans-serif">Realite</text>
  <text x="56" y="178" font-size="40" font-weight="700" fill="#2f5d50" font-family="Arial, sans-serif">Event</text>
  ${titleLines
    .map(
      (line, index) =>
        `<text x="56" y="${250 + index * 74}" font-size="64" font-weight="700" fill="#2f281f" font-family="Arial, sans-serif">${escapeXml(line)}</text>`
    )
    .join("\n  ")}
  <text x="56" y="500" font-size="34" fill="#5d503d" font-family="Arial, sans-serif">${escapeXml(schedule)}</text>
  ${owner ? `<text x="56" y="542" font-size="30" fill="#76664f" font-family="Arial, sans-serif">${escapeXml(owner)}</text>` : ""}
  <line x1="56" y1="560" x2="1144" y2="560" stroke="#d88973" stroke-width="2"/>
  <text x="56" y="603" font-size="28" font-weight="700" fill="#1e3a34" font-family="Arial, sans-serif">Event auf Realite</text>
  <text x="1144" y="603" text-anchor="end" font-size="26" fill="#76664f" font-family="Arial, sans-serif">realite.app</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=0, s-maxage=86400"
    }
  });
}
