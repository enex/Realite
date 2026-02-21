import ImageResponse from "@takumi-rs/image-response/wasm";
import takumiWasmModule from "@takumi-rs/wasm/next";

import {
  EVENT_SHARE_FALLBACK_DESCRIPTION,
  EVENT_SHARE_FALLBACK_TITLE,
  formatEventShareSchedule,
  getEventShareCopy,
  getPublicEventSharePreviewByShortId
} from "@/src/lib/event-share";

export const runtime = "nodejs";
export const alt = "Event auf Realite";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default async function EventOgImage({
  params
}: {
  params: Promise<{ shortEventId: string }>;
}) {
  const { shortEventId } = await params;
  const preview = await getPublicEventSharePreviewByShortId(shortEventId);
  const copy = getEventShareCopy(preview);
  const schedule = preview ? formatEventShareSchedule(preview) : EVENT_SHARE_FALLBACK_DESCRIPTION;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(140deg, #f0fdfa 0%, #ecfeff 38%, #e2e8f0 100%)",
          color: "#0f172a",
          padding: 56,
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Geist, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              height: 42,
              width: 42,
              borderRadius: 12,
              backgroundColor: "#0f766e",
              color: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700
            }}
          >
            R
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, color: "#115e59" }}>Realite</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ margin: 0, fontSize: 30, color: "#0f766e", fontWeight: 600 }}>Event Link</p>
          <p
            style={{
              margin: 0,
              fontSize: 64,
              lineHeight: 1.06,
              fontWeight: 700,
              letterSpacing: -1.5
            }}
          >
            {preview ? copy.title : EVENT_SHARE_FALLBACK_TITLE}
          </p>
          <p style={{ margin: 0, fontSize: 30, color: "#1e293b" }}>{schedule}</p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #99f6e4",
            paddingTop: 20
          }}
        >
          <span style={{ fontSize: 24, color: "#134e4a", fontWeight: 600 }}>Event auf Realite</span>
          <span style={{ fontSize: 22, color: "#334155" }}>realite.app/e</span>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
      format: "png",
      module: takumiWasmModule
    }
  );
}
