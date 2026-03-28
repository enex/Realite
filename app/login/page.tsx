import { redirect } from "next/navigation";

import { AuthProviderButtons } from "@/src/components/auth-provider-buttons";
import { getAuthSession } from "@/src/lib/auth";
import { getAvailableAuthProviders } from "@/src/lib/provider-adapters";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/";

  if (session?.user.email) {
    redirect(callbackUrl as never);
  }

  const providers = getAvailableAuthProviders();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16 text-slate-900">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Realite</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Anmelden</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Mit welchem Konto willst du weitermachen?</p>
        <div className="mt-7">
          {providers.length > 0 ? (
            <AuthProviderButtons callbackUrl={callbackUrl} providers={providers} />
          ) : (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Aktuell ist kein Login-Provider konfiguriert. Pruefe die Auth-Umgebungsvariablen fuer dieses Deployment.
            </p>
          )}
        </div>
        <p className="mt-6 text-xs text-slate-500">Mehr erklaeren wir dir erst danach. Kalender und weitere Verbindungen kommen spaeter.</p>
      </div>
    </main>
  );
}
