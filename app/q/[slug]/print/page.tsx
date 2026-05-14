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
  const title = qr.label ?? qr.singlesEventName ?? "Realite QR-Code";

  return (
    <EventQrPrintPage
      eventTitle={title}
      scanHeadline="Offen für Gespräche?"
      scanBenefit="Scanne den Code und sieh, wer hier gerade auch ansprechbar ist."
      eventUrl={qrUrl}
      qrImagePath={qrImagePath}
      backHref={`/q/${slug}/manage`}
      persistenceKey={`placeholder-qr:${slug}`}
      copyVariants={[
        {
          code: "a",
          label: "Klassisch",
          headline: "Offen für Gespräche?",
          benefit: "Scanne den Code und sieh, wer hier gerade auch ansprechbar ist.",
          footer: "Bewusst sichtbar",
        },
        {
          code: "b",
          label: "Direkt",
          headline: "Wer ist offen?",
          benefit: "Scannen, einchecken und relevante Personen am Ort sehen.",
          footer: "Ohne Rumraten",
        },
        {
          code: "c",
          label: "Locker",
          headline: "Kurz hallo sagen?",
          benefit: "Der Code zeigt nur Personen, die sich hier bewusst sichtbar machen.",
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
          benefit: "Scannen und passende Personen am Ort entdecken.",
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
