import { redirect } from "next/navigation";

import { AuthProviderButtons } from "@/src/components/auth-provider-buttons";
import { getAuthSession } from "@/src/lib/auth";
import { getAvailableAuthProviders } from "@/src/lib/provider-adapters";
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

  const providers = getAvailableAuthProviders();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16 text-foreground">
      <div className="rounded-[32px] border border-border bg-card p-8 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Realite MCP</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Anmeldung für MCP-Zugriff</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Wähle einen verfügbaren Kontopfad. Der Zugang für Realite und die spätere MCP-Freigabe bleibt danach derselbe.
        </p>
        <div className="mt-7">
          {providers.length > 0 ? (
            <AuthProviderButtons callbackUrl={currentPath} providers={providers} />
          ) : (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              Aktuell ist kein Login-Provider für dieses Deployment konfiguriert.
            </p>
          )}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Nach dem Login bestätigst du im nächsten Schritt nur noch den MCP-Zugriff.</p>
      </div>
    </main>
  );
}
