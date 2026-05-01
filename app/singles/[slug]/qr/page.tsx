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
    />
  );
}
