import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { EventQrPrintPage } from "@/src/components/event-qr-print-page";
import { getPlaceholderQrBySlug } from "@/src/lib/placeholder-qr";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `QR-Code /q/${slug} drucken`,
    description: "Druckvorlage für einen Realite Platzhalter-QR-Code.",
  };
}

function normalizeForwardedHeader(value: string | null) {
  return value?.split(",")[0]?.trim().replace(/\/+$/, "") ?? "";
}

function getOriginFromHeaders(requestHeaders: Headers) {
  const forwardedProto = normalizeForwardedHeader(
    requestHeaders.get("x-forwarded-proto"),
  );
  const forwardedHost = normalizeForwardedHeader(
    requestHeaders.get("x-forwarded-host"),
  );
  const host = normalizeForwardedHeader(requestHeaders.get("host"));
  const activeHost = forwardedHost || host;
  const localProtocol =
    activeHost.startsWith("localhost") ||
    activeHost.startsWith("127.0.0.1") ||
    activeHost.startsWith("[::1]")
      ? "http"
      : "https";
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : localProtocol;
  if (forwardedHost) return `${protocol}://${forwardedHost}`;
  if (host) return `${protocol}://${host}`;
  return "https://realite.app";
}

export default async function QrPrintPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAppUser();
  if (!user) {
    redirect(`/q/${slug}`);
  }

  const qr = await getPlaceholderQrBySlug(slug);
  if (!qr || qr.ownedBy !== user.id) {
    redirect("/q");
  }

  const requestHeaders = await headers();
  const origin = getOriginFromHeaders(requestHeaders);
  const qrUrl = `${origin}/q/${slug}`;
  const qrImagePath = `/q/${slug}/print/code`;
  const title = qr.label ?? qr.singlesEventName ?? "";

  return (
    <EventQrPrintPage
      eventTitle={title}
      scanHeadline="Offen für Gespräche?"
      scanBenefit="Scanne den Code und sieh, wer hier bewusst ansprechbar ist und ob Dating oder Social im Profil aktiviert wurde."
      eventUrl={qrUrl}
      qrImagePath={qrImagePath}
      backHref={`/q/${slug}/manage`}
      persistenceKey={`placeholder-qr:${slug}`}
      copyVariants={[
        {
          code: "a",
          label: "Klassisch",
          headline: "Offen für Gespräche?",
          benefit:
            "Scanne den Code und sieh passende Personen, die sich vor Ort bewusst sichtbar gemacht haben.",
          footer: "Bewusst sichtbar vor Ort",
        },
        {
          code: "b",
          label: "Direkt",
          headline: "Wer ist offen?",
          benefit:
            "Scannen, einchecken und nur Personen sehen, die gerade aktiv ansprechbar sind.",
          footer: "Ohne Rumraten",
        },
        {
          code: "c",
          label: "Locker",
          headline: "Kurz hallo sagen?",
          benefit:
            "Der Code zeigt nur Personen, die sich hier bewusst sichtbar machen und gerade da sind.",
          footer: "Opt-in vor Ort",
        },
        {
          code: "d",
          label: "Minimal",
          headline: "Hier offen?",
          benefit:
            "Ein Scan reicht: Profil öffnen, Status wählen und sichtbar werden, wenn du willst.",
          footer: "Kurz einchecken",
        },
        {
          code: "e",
          label: "Mutig",
          headline: "Mach es leichter.",
          benefit:
            "Zeig nur hier am Ort, dass du offen für Austausch bist - ohne dauerhafte Sichtbarkeit.",
          footer: "Weniger Raten, mehr Klarheit",
        },
        {
          code: "f",
          label: "Neugier",
          headline: "Wer passt hier?",
          benefit:
            "Scannen und sehen, wer zu dir passt - inklusive Dating-Kontext, falls gewünscht.",
          footer: "Erst ansehen, dann ansprechen",
        },
        {
          code: "g",
          label: "Diskret",
          headline: "Nur wenn du willst.",
          benefit: "Du entscheidest selbst, ob du hier sichtbar wirst.",
          footer: "Privat gesteuert",
        },
        {
          code: "h",
          label: "Locker",
          headline: "Sag einfacher hallo.",
          benefit: "Der Code hilft, wenn beide wirklich offen dafür sind.",
          footer: "Low pressure",
        },
        {
          code: "i",
          label: "Dating-Klarheit",
          headline: "Dating oder lieber nur social?",
          benefit:
            "Beim Scan siehst du, ob passende Personen Dating aktiviert haben oder nur locker quatschen wollen.",
          footer: "Kontext statt Missverständnis",
        },
        {
          code: "j",
          label: "Social First",
          headline: "Nicht jeder ist hier fürs Dating.",
          benefit:
            "Der Check-in trennt klar zwischen Dating und nicht Dating - so bleibt Ansprechen respektvoll.",
          footer: "Respektvoll begegnen",
        },
        {
          code: "k",
          label: "Aushang",
          headline: "Wer möchte heute angesprochen werden?",
          benefit:
            "Scanne den Code: sichtbar sind nur aktiv eingecheckte Personen mit passendem Offenheits-Status.",
          footer: "Nur opt-in, kein Zufall",
        },
        {
          code: "l",
          label: "Festival",
          headline: "Schnell sehen, was passt.",
          benefit:
            "Vor Ort zeigt Realite, wer jetzt offen ist - Dating exklusiv, Dating plus Social oder nur Social.",
          footer: "Direkt vor Ort klären",
        },
      ]}
    />
  );
}
