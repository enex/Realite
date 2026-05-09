import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EventQrPrintPage } from "@/src/components/event-qr-print-page";
import { getSinglesHereEventBySlug } from "@/src/lib/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getSinglesHereEventBySlug(slug);

  return {
    title: event ? `${event.name} QR-Codes` : "Singles-hier QR-Codes",
    description: "Druckvorlage fuer QR-Codes, die auf die Singles-hier Eventseite in Realite verweisen.",
  };
}

function normalizeForwardedHeader(value: string | null) {
  return value?.split(",")[0]?.trim().replace(/\/+$/, "") ?? "";
}

function getOriginFromHeaders(requestHeaders: Headers) {
  const forwardedProto = normalizeForwardedHeader(requestHeaders.get("x-forwarded-proto"));
  const forwardedHost = normalizeForwardedHeader(requestHeaders.get("x-forwarded-host"));
  const host = normalizeForwardedHeader(requestHeaders.get("host"));
  const activeHost = forwardedHost || host;
  const localProtocol =
    activeHost.startsWith("localhost") ||
    activeHost.startsWith("127.0.0.1") ||
    activeHost.startsWith("[::1]")
      ? "http"
      : "https";
  const protocol =
    forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : localProtocol;

  if (forwardedHost) {
    return `${protocol}://${forwardedHost}`;
  }

  if (host) {
    return `${protocol}://${host}`;
  }

  return "https://realite.app";
}

export default async function SinglesHereQrPrintRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getSinglesHereEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const eventPath = `/singles/${encodeURIComponent(event.slug)}`;
  const requestHeaders = await headers();
  const origin = getOriginFromHeaders(requestHeaders);

  return (
    <EventQrPrintPage
      eventTitle={event.name}
      scanHeadline="Neue Leute treffen?"
      scanBenefit="Scanne den Code und sieh, wer hier gerade auch offen ist."
      eventUrl={`${origin}${eventPath}`}
      qrImagePath={`${eventPath}/qr/code`}
      backHref={eventPath}
      copyVariants={[
        {
          code: "a",
          label: "Klassisch",
          headline: "Neue Leute treffen?",
          benefit: "Scanne den Code und sieh, wer hier gerade auch offen ist.",
          footer: "Bewusst sichtbar",
        },
        {
          code: "b",
          label: "Direkt",
          headline: "Single hier?",
          benefit: "Einchecken, sichtbar werden und passende Personen vor Ort sehen.",
          footer: "Ohne Rumraten",
        },
        {
          code: "c",
          label: "Offen",
          headline: "Ansprechen okay?",
          benefit: "Scannen und nur zeigen, wenn du hier wirklich offen dafür bist.",
          footer: "Opt-in vor Ort",
        },
        {
          code: "d",
          label: "Minimal",
          headline: "Hier offen?",
          benefit: "Ein Scan reicht, um bewusst sichtbar zu werden.",
          footer: "Kurz einchecken",
        },
        {
          code: "e",
          label: "Mutig",
          headline: "Mach es leichter.",
          benefit: "Zeig nur hier, dass du offen für ein Gespräch bist.",
          footer: "Weniger Raten",
        },
        {
          code: "f",
          label: "Neugier",
          headline: "Wer passt hier?",
          benefit: "Scannen und passende Personen vor Ort entdecken.",
          footer: "Erst ansehen",
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
      ]}
    />
  );
}
