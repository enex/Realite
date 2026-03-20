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
          Der MCP-Client leitet dich ueber Better Auth in Realite ein. Melde dich mit deinem Google-Konto an, damit
          der OAuth-Flow fortgesetzt werden kann.
        </p>
        <div className="mt-8">
          <a
            href={signInHref}
            className="inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            Mit Google anmelden
          </a>
        </div>
      </div>
    </main>
  );
}
