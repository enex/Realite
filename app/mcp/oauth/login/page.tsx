import { redirect } from "next/navigation";

import { getAuthSession } from "@/src/lib/auth";
import { toQueryString } from "@/src/lib/utils/query-string";

export const dynamic = "force-dynamic";

export default async function MpcOAuthLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;
  const queryString = toQueryString(params);
  const currentPath = queryString ? `/mcp/oauth/login?${queryString}` : "/mcp/oauth/login";

  if (session?.user.email) {
    redirect(queryString ? `/api/auth/oauth2/authorize?${queryString}` : "/");
  }

  const signInHref = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(currentPath)}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16 text-slate-900">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Realite MCP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Anmeldung fuer MCP-Zugriff</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Der MCP-Client leitet dich ueber Better Auth in Realite ein. Der technische Login startet aktuell ueber
          Google, der Produktkern bleibt aber gleich: Aktivitaeten planen, Sichtbarkeit steuern und auf Vorschlaege
          reagieren.
        </p>
        <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
          <p className="text-sm font-semibold text-teal-900">Du musst keinen Kalender verbinden, um loszulegen.</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-teal-950">
            <li>Events, Gruppen und Vorschlaege funktionieren auch ohne Kalenderkontext.</li>
            <li>Nichts wird automatisch veroeffentlicht oder an Kontakte ausgespielt.</li>
            <li>Kalender- und Kontaktzugriff bleiben spaetere, bewusste Upgrade-Schritte.</li>
          </ul>
        </div>
        <div className="mt-8">
          <a
            href={signInHref}
            className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            Mit Google anmelden
          </a>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href="/docs/ohne-kalender-starten"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Ohne Kalender starten</p>
            <p className="mt-1 leading-6">
              Der Kernflow fuer Aktivitaet, Gruppen, Sichtbarkeit und Reaktion funktioniert direkt.
            </p>
          </a>
          <a
            href="/docs/login-und-onboarding-pfade"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
          >
            <p className="font-semibold text-slate-900">Spaeter Kalender verbinden</p>
            <p className="mt-1 leading-6">
              Sieh dir an, wie Login, optionaler Kalenderzugriff und Provider sauber getrennt bleiben.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
