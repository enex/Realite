import { ImageResponse } from "next/og";

export const alt = "Realite - Weniger Scrollen. Mehr echte Momente.";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "54px",
          background:
            "radial-gradient(circle at 10% 14%, rgba(100, 180, 156, 0.4), transparent 35%), radial-gradient(circle at 88% 18%, rgba(237, 157, 114, 0.34), transparent 40%), linear-gradient(130deg, #173732 0%, #1f4a42 48%, #2f5d50 100%)",
          color: "#f8fafc",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            borderRadius: "999px",
            border: "1px solid rgba(226, 232, 240, 0.35)",
            padding: "10px 18px",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            backgroundColor: "rgba(15, 23, 42, 0.25)"
          }}
        >
          Realite
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "850px" }}>
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05 }}>Weniger Scrollen.</div>
          <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05 }}>Mehr echte Momente.</div>
          <div style={{ fontSize: 32, lineHeight: 1.35, color: "#d1fae5" }}>
            Gruppenbasierte Event-Matches auf Basis deines Kalenders.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.35)",
            paddingTop: "22px",
            fontSize: 28
          }}
        >
          <div style={{ fontWeight: 700 }}>Für echte Verbindung statt endloser Feeds</div>
          <div style={{ color: "#fde68a", fontWeight: 700 }}>realite.app</div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
