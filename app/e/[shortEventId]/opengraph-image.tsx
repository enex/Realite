import { ImageResponse } from "next/og";

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
export const contentType = "image/png";

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
  const titleLines = wrapText(title, 30, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 56px",
          background:
            "radial-gradient(circle at 12% 14%, rgba(103, 193, 168, 0.2), transparent 35%), radial-gradient(circle at 82% 24%, rgba(249, 162, 117, 0.18), transparent 38%), linear-gradient(140deg, #f7f1e3 0%, #f2ead8 56%, #eadfc8 100%)",
          color: "#2f281f",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              borderRadius: "999px",
              border: "1px solid rgba(47, 93, 80, 0.35)",
              padding: "8px 16px",
              fontSize: 24,
              fontWeight: 700,
              color: "#1e3a34"
            }}
          >
            Event auf Realite
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {titleLines.map((line, index) => (
              <div
                key={`${line}-${index}`}
                style={{
                  fontSize: 66,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  color: "#2f281f"
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#5d503d" }}>
          <div style={{ fontSize: 32, lineHeight: 1.25 }}>{schedule}</div>
          {owner ? (
            <div style={{ fontSize: 28, lineHeight: 1.2, color: "#76664f" }}>{owner}</div>
          ) : (
            <div style={{ fontSize: 28, lineHeight: 1.2, color: "#76664f" }}>Teilen und gemeinsam planen</div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(216, 137, 115, 0.7)",
              paddingTop: "18px",
              marginTop: "4px"
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1e3a34" }}>Realite</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#76664f" }}>realite.app</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control": "public, max-age=0, s-maxage=86400"
      }
    }
  );
}
