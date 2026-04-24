import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import { getWeeklyShareCampaignByToken } from "@/src/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Wochenstatus auf Realite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getOwnerLabel(ownerName: string | null, ownerEmail: string) {
  return ownerName?.trim() || ownerEmail.split("@")[0] || "Jemand";
}

export default async function WeeklyShareOgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaign = await getWeeklyShareCampaignByToken(token);
  if (!campaign) {
    notFound();
  }

  const owner = getOwnerLabel(campaign.ownerName, campaign.ownerEmail);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 54,
          background:
            "radial-gradient(circle at 18% 18%, rgba(54, 211, 153, 0.42), transparent 28%), radial-gradient(circle at 84% 18%, rgba(251, 146, 60, 0.45), transparent 30%), linear-gradient(135deg, #16130f 0%, #272016 50%, #f3ead8 50%, #efe1c3 100%)",
          color: "#f8f1e2",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", width: "100%", gap: 44 }}>
          <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                borderRadius: 999,
                background: "#f97316",
                padding: "10px 20px",
                fontSize: 28,
                fontWeight: 900,
                color: "#21160e",
              }}
            >
              Wochenstatus
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Nicht chatten.
              </div>
              <div style={{ fontSize: 76, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Mitmachen.
              </div>
              <div style={{ marginTop: 18, fontSize: 34, lineHeight: 1.18, color: "#c8f7e2" }}>
                {owner} teilt konkrete Vorhaben auf Realite.
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#f8f1e2" }}>
              realite.app
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 430,
              flexDirection: "column",
              justifyContent: "center",
              gap: 18,
              color: "#21160e",
            }}
          >
            {["Heute raus?", "Freitag Sport?", "Sonntag Kaffee?"].map((text, index) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 34,
                  background: index === 1 ? "#134e4a" : "#fffaf0",
                  color: index === 1 ? "#ecfeff" : "#21160e",
                  padding: "24px 28px",
                  boxShadow: "0 18px 45px rgba(32, 24, 15, 0.22)",
                  transform: `translateX(${index === 1 ? -34 : 0}px) rotate(${index === 0 ? -2 : index === 1 ? 2 : -1}deg)`,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.72 }}>Realite Vorhaben</div>
                <div style={{ marginTop: 6, fontSize: 42, fontWeight: 900 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "cache-control": "public, max-age=0, s-maxage=86400" },
    },
  );
}
