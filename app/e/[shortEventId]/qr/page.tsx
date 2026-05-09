import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { EventQrPrintPage } from "@/src/components/event-qr-print-page";
import {
  getEventShareCopy,
  getPublicEventSharePreviewByShortId,
} from "@/src/lib/event-share";
import { getVisibleEventForUserById } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { enlargeUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shortEventId: string }>;
}): Promise<Metadata> {
  const { shortEventId } = await params;
  const preview = await getPublicEventSharePreviewByShortId(shortEventId);
  const copy = getEventShareCopy(preview);

  return {
    title: `${copy.title} QR-Codes`,
    description: "Druckvorlage fuer QR-Codes, die auf das Event in Realite verweisen.",
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

export default async function EventQrPrintRoute({
  params,
}: {
  params: Promise<{ shortEventId: string }>;
}) {
  const { shortEventId } = await params;
  const eventPath = `/e/${encodeURIComponent(shortEventId)}`;
  const publicPreview = await getPublicEventSharePreviewByShortId(shortEventId);
  let event = publicPreview;

  if (!event) {
    let eventId = "";
    try {
      eventId = enlargeUUID(shortEventId);
    } catch {
      notFound();
    }

    const user = await requireAppUser();
    if (!user) {
      notFound();
    }

    event = await getVisibleEventForUserById({ userId: user.id, eventId });
  }

  if (!event) {
    notFound();
  }

  const requestHeaders = await headers();
  const origin = getOriginFromHeaders(requestHeaders);
  const eventUrl = `${origin}${eventPath}`;
  const copy = getEventShareCopy(event);
  const qrImagePath = `${eventPath}/qr/code`;

  return (
    <EventQrPrintPage
      eventTitle={copy.title}
      scanHeadline="Kommst du mit?"
      scanBenefit="Scannen, Event öffnen und direkt zusagen. So weiß die Gruppe, dass du dabei bist."
      eventUrl={eventUrl}
      qrImagePath={qrImagePath}
      backHref={eventPath}
      copyVariants={[
        {
          code: "a",
          label: "Klassisch",
          headline: "Kommst du mit?",
          benefit: "Scannen, Event öffnen und direkt zusagen. So weiß die Gruppe, dass du dabei bist.",
          footer: "Mitmachen statt suchen",
        },
        {
          code: "b",
          label: "Direkt",
          headline: "Heute dabei?",
          benefit: "Scannen und mit einem Tap zeigen, ob du dabei bist.",
          footer: "Schneller planen",
        },
        {
          code: "c",
          label: "Spontan",
          headline: "Was geht hier?",
          benefit: "Scanne den Code und finde direkt zur gemeinsamen Aktivität.",
          footer: "Einfach dazukommen",
        },
        {
          code: "d",
          label: "Minimal",
          headline: "Kurz mitkommen?",
          benefit: "Ein Scan reicht, um das Event zu öffnen und dabei zu sein.",
          footer: "Wenig Aufwand",
        },
        {
          code: "e",
          label: "Gruppe",
          headline: "Wer ist dabei?",
          benefit: "Öffnen, zusagen und der Gruppe Planungssicherheit geben.",
          footer: "Mehr Überblick",
        },
        {
          code: "f",
          label: "Neugier",
          headline: "Schon gesehen?",
          benefit: "Scanne den Code und schau, ob die Aktivität zu dir passt.",
          footer: "Erst ansehen",
        },
        {
          code: "g",
          label: "Klar",
          headline: "Plan steht.",
          benefit: "Scannen, Details öffnen und direkt entscheiden.",
          footer: "Ohne Chat-Chaos",
        },
        {
          code: "h",
          label: "Einladung",
          headline: "Komm vorbei.",
          benefit: "Der Link führt dich direkt zur Aktivität und zur Zusage.",
          footer: "Einladung öffnen",
        },
      ]}
    />
  );
}
