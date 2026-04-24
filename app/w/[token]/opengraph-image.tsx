import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

import {
  getWeeklyShareCampaignByToken,
  listWeeklySharePublicActivities,
} from "@/src/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Wochenstatus auf Realite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getOwnerLabel(ownerName: string | null, ownerEmail: string) {
  return ownerName?.trim() || ownerEmail.split("@")[0] || "Jemand";
}

function parseOpenIntentions(value: string | null | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function cleanTitle(value: string) {
  const cleaned = value.replace(/#[^\s]+/gi, "").replace(/\s+/g, " ").trim();
  return cleaned.length > 34 ? `${cleaned.slice(0, 31).trimEnd()}...` : cleaned;
}

function formatActivityTime(startsAt: Date) {
  return startsAt.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
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
  const activities = await listWeeklySharePublicActivities(campaign.ownerUserId);
  const openIntentions = parseOpenIntentions(campaign.openIntentions);
  const cards = [
    ...activities.slice(0, 3).map((activity) => ({
      eyebrow: formatActivityTime(activity.startsAt),
      title: cleanTitle(activity.title),
      detail: activity.location?.trim() ? `${activity.location.trim()} · Komm mit` : "Komm mit und mach mit",
      kind: "event" as const,
    })),
    ...openIntentions.slice(0, Math.max(0, 3 - activities.length)).map((intention) => ({
      eyebrow: "Offene Idee",
      title: cleanTitle(intention),
      detail: "Sag zu, dann wird daraus ein Plan",
      kind: "idea" as const,
    })),
  ];
  const visibleCards = cards.length > 0
    ? cards
    : [
        {
          eyebrow: "Diese Woche",
          title: "Komm mit raus",
          detail: "Öffne Realite und mach aus Ideen echte Treffen",
          kind: "idea" as const,
        },
      ];

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
              <div style={{ display: "flex", fontSize: 68, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Geh mit.
              </div>
              <div style={{ display: "flex", fontSize: 68, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Mach mit.
              </div>
              <div style={{ display: "flex", marginTop: 18, fontSize: 34, lineHeight: 1.18, color: "#c8f7e2" }}>
                {owner} lädt dich zu echten Vorhaben ein.
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
            {visibleCards.map((card, index) => (
              <div
                key={`${card.eyebrow}-${card.title}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 34,
                  background: card.kind === "event" ? "#fffaf0" : "#134e4a",
                  color: card.kind === "event" ? "#21160e" : "#ecfeff",
                  padding: "24px 28px",
                  boxShadow: "0 18px 45px rgba(32, 24, 15, 0.22)",
                  transform: `translateX(${index === 1 ? -34 : 0}px) rotate(${index === 0 ? -2 : index === 1 ? 2 : -1}deg)`,
                }}
              >
                <div style={{ display: "flex", fontSize: 22, fontWeight: 800, opacity: 0.72 }}>{card.eyebrow}</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 42, fontWeight: 900 }}>{card.title}</div>
                <div style={{ display: "flex", marginTop: 8, fontSize: 24, fontWeight: 700, opacity: 0.72 }}>{card.detail}</div>
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
