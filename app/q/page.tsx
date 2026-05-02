import { redirect } from "next/navigation";
import Link from "next/link";
import { QrCode } from "@phosphor-icons/react/dist/ssr";

import { listPlaceholderQrsForUser } from "@/src/lib/placeholder-qr";
import { requireAppUser } from "@/src/lib/session";
import { CreateQrButton } from "@/src/components/create-qr-button";

export const dynamic = "force-dynamic";

export default async function MyQrCodesPage() {
  const user = await requireAppUser();
  if (!user) {
    redirect("/login");
  }

  const qrCodes = await listPlaceholderQrsForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            ← Zum Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-black text-foreground">
            Meine QR-Codes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wiederverwendbare QR-Codes, die du täglich auf verschiedene Events
            zeigen lassen kannst.
          </p>
        </div>
        <CreateQrButton />
      </div>

      {qrCodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-10 text-center">
          <QrCode
            aria-hidden
            className="mx-auto h-10 w-10 text-muted-foreground"
          />
          <p className="mt-3 text-sm font-semibold text-foreground">
            Noch keine QR-Codes
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Erstelle deinen ersten QR-Code und verteile ihn – du kannst ihn
            täglich auf ein anderes Event zeigen lassen.
          </p>
          <div className="mt-4">
            <CreateQrButton />
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {qrCodes.map((qr) => (
            <li
              key={qr.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {qr.label ?? `QR-Code /${qr.slug}`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                    /q/{qr.slug}
                  </p>
                  {qr.singlesEventName ? (
                    <p className="mt-1 text-sm text-teal-700">
                      → {qr.singlesEventName}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Kein Event verknüpft
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <a
                    href={`/q/${qr.slug}/print`}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Drucken
                  </a>
                  <a
                    href={`/q/${qr.slug}/manage`}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Verwalten
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
