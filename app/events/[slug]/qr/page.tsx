import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EventQrPrintPage } from "@/src/components/event-qr-print-page";
import {
  getSinglesHereEventBySlug,
  recordOrganizerAnalyticsEvent,
} from "@/src/lib/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getSinglesHereEventBySlug(slug);

  return {
    title: event ? `${event.name} QR-Codes` : "Event QR-Codes",
    description: "Druckvorlage für QR-Codes und Poster zur Event-Seite in Realite.",
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

export default async function EventEntryQrPrintRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getSinglesHereEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const eventPath = `/events/${encodeURIComponent(event.slug)}`;
  const requestHeaders = await headers();
  const origin = getOriginFromHeaders(requestHeaders);

  await recordOrganizerAnalyticsEvent({
    organizerUserId: event.createdBy,
    eventId: event.id,
    metric: "event_qr_print_view",
    sourcePath: `${eventPath}/qr`,
    actorUserId: null,
  }).catch(() => {});

  return (
    <EventQrPrintPage
      eventTitle={event.name}
      scanHeadline="Neue Leute treffen?"
      scanBenefit="Scanne den Code und sieh, wer hier gerade auch offen ist."
      eventUrl={`${origin}${eventPath}`}
      qrImagePath={`${eventPath}/qr/code`}
      backHref={eventPath}
      persistenceKey={`event-entry:${event.id}`}
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
      ]}
    />
  );
}
