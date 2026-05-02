import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";

import { getPlaceholderQrBySlug } from "@/src/lib/placeholder-qr";
import { listSinglesHereEventsForUser } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { ManageQrContent } from "@/src/components/manage-qr-content";

export const dynamic = "force-dynamic";

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

export default async function ManageQrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireAppUser();
  if (!user) {
    redirect("/login");
  }

  const qr = await getPlaceholderQrBySlug(slug);
  if (!qr || qr.ownedBy !== user.id) {
    redirect("/q");
  }

  const singlesEvents = await listSinglesHereEventsForUser(user.id);
  const singlesOptions = singlesEvents.map((e) => ({
    slug: e.slug,
    name: e.name,
  }));

  const requestHeaders = await headers();
  const origin = getOriginFromHeaders(requestHeaders);
  const qrUrl = `${origin}/q/${slug}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/q"
          className="text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          ← Meine QR-Codes
        </Link>
        <Link
          href={`/q/${slug}/print`}
          className="text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          QR-Code drucken →
        </Link>
      </div>

      <ManageQrContent
        slug={slug}
        label={qr.label}
        singlesSlug={qr.singlesSlug}
        singlesEventName={qr.singlesEventName}
        qrUrl={qrUrl}
        singlesOptions={singlesOptions}
      />
    </main>
  );
}
