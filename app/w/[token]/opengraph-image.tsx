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
  return cleaned.length > 24 ? `${cleaned.slice(0, 21).trimEnd()}...` : cleaned;
}

function cleanDetail(value: string) {
  const cleaned = value.replace(/\b\d{5}\b/g, "").replace(/\s+/g, " ").replace(/^,\s*|\s*,$/g, "").trim();
  return cleaned.length > 26 ? `${cleaned.slice(0, 23).trimEnd()}...` : cleaned;
}

function getActivityDetail(location: string | null) {
  const normalized = location?.trim();
  if (!normalized) {
    return "Direkt dabei sein";
  }

  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const postalCity = parts.find((part) => /\b\d{5}\b/.test(part));
  if (postalCity) {
    return cleanDetail(postalCity) || "Direkt dabei sein";
  }

  const withoutCountry = parts.filter((part) => !/^(deutschland|germany)$/i.test(part));
  const shortTail = [...withoutCountry].reverse().find((part) => part.length <= 26);
  if (shortTail) {
    return cleanDetail(shortTail);
  }

  return cleanDetail(parts[0] ?? normalized);
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
      detail: getActivityDetail(activity.location),
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
            "radial-gradient(circle at 16% 18%, rgba(54, 211, 153, 0.42), transparent 28%), radial-gradient(circle at 88% 18%, rgba(251, 146, 60, 0.34), transparent 30%), linear-gradient(135deg, #16130f 0%, #272016 52%, #f3ead8 52%, #efe1c3 100%)",
          color: "#f8f1e2",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", width: "100%", gap: 34 }}>
          <div style={{ display: "flex", width: 450, flexDirection: "column", justifyContent: "space-between" }}>
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
              <div style={{ display: "flex", fontSize: 62, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Geh mit.
              </div>
              <div style={{ display: "flex", fontSize: 62, fontWeight: 900, letterSpacing: -4, lineHeight: 0.95 }}>
                Mach mit.
              </div>
              <div style={{ display: "flex", marginTop: 18, fontSize: 30, lineHeight: 1.18, color: "#c8f7e2" }}>
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
              width: 590,
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
              color: "#21160e",
            }}
          >
            {visibleCards.map((card, index) => (
              <div
                key={`${card.eyebrow}-${card.title}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 28,
                  background: card.kind === "event" ? "#fffaf0" : "#134e4a",
                  color: card.kind === "event" ? "#21160e" : "#ecfeff",
                  padding: "18px 24px",
                  boxShadow: "0 18px 45px rgba(32, 24, 15, 0.22)",
                  transform: `translateX(${index === 1 ? -24 : 0}px) rotate(${index === 0 ? -1 : index === 1 ? 1 : -1}deg)`,
                }}
              >
                <div style={{ display: "flex", fontSize: 22, fontWeight: 900, opacity: 0.72 }}>{card.eyebrow}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 44, fontWeight: 900, lineHeight: 1.02 }}>{card.title}</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 25, fontWeight: 800, opacity: 0.72 }}>{card.detail}</div>
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
