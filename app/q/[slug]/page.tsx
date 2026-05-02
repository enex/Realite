import { redirect } from "next/navigation";
import Link from "next/link";

import {
  claimPlaceholderQr,
  getPlaceholderQrBySlug,
} from "@/src/lib/placeholder-qr";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export default async function QrScanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const qr = await getPlaceholderQrBySlug(slug);

  if (!qr) {
    redirect("/");
  }

  if (qr.singlesSlug) {
    redirect(`/singles/${encodeURIComponent(qr.singlesSlug)}`);
  }

  const user = await requireAppUser();

  if (!user) {
    redirect("/");
  }

  if (qr.ownedBy === user.id) {
    redirect(`/q/${slug}/manage` as never);
  }

  if (qr.ownedBy !== null) {
    redirect("/");
  }

  // Unclaimed QR code — show claim form
  const userId = user.id;

  async function handleClaim() {
    "use server";
    await claimPlaceholderQr({ slug, userId });
    redirect(`/q/${slug}/manage` as never);
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
          Realite
        </p>
        <h1 className="mt-3 text-xl font-black text-foreground">
          QR-Code beanspruchen
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser QR-Code gehört noch niemandem. Du kannst ihn jetzt beanspruchen
          und mit einem Event verknüpfen.
        </p>
        <form action={handleClaim} className="mt-5">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            QR-Code beanspruchen
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline">
            Zurück zur Startseite
          </Link>
        </p>
      </div>
    </main>
  );
}
