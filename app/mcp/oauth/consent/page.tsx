import { redirect } from "next/navigation";

import { getAuthSession } from "@/src/lib/auth";
import { toQueryString } from "@/src/lib/utils/query-string";

export const dynamic = "force-dynamic";

export default async function MpcOAuthConsentPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;
  const queryString = toQueryString(params);
  const callbackPath = queryString ? `/mcp/oauth/consent?${queryString}` : "/mcp/oauth/consent";

  if (!session?.user.email) {
    redirect(`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const clientId = typeof params.client_id === "string" ? params.client_id : "Unbekannter Client";
  const scopes =
    typeof params.scope === "string"
      ? params.scope.split(" ").map((scope) => scope.trim()).filter(Boolean)
      : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16 text-slate-900">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Realite MCP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Zugriff bestaetigen</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Der Client <span className="font-semibold text-slate-900">{clientId}</span> moechte auf dein Realite-Konto
          zugreifen.
        </p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Angeforderte Scopes</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {scopes.length > 0 ? scopes.map((scope) => <li key={scope}>{scope}</li>) : <li>Standard-Zugriff</li>}
          </ul>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form action="/api/mcp/oauth/consent" method="post">
            <input type="hidden" name="oauthQuery" value={queryString} />
            <input type="hidden" name="accept" value="true" />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              Zugriff erlauben
            </button>
          </form>
          <form action="/api/mcp/oauth/consent" method="post">
            <input type="hidden" name="oauthQuery" value={queryString} />
            <input type="hidden" name="accept" value="false" />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ablehnen
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
