import { Dashboard } from "@/src/components/dashboard";
import { getAuthSession } from "@/src/lib/auth";
import { listPublicAlleEvents } from "@/src/lib/repository";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthSession();
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const callbackUrl = query.toString() ? `/?${query.toString()}` : "/";

  if (!session?.user.email) {
    const publicAlleEvents = await listPublicAlleEvents(8);

    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Realite MVP</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Finde Events, die wirklich in deinen Kalender passen
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Melde dich mit Google an, verbinde deinen Kalender und teile Events mit Tags wie #kontakte,
            #dating oder #alle. Realite schlägt dir passende Termine vor.
          </p>
          <a
            href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="mt-8 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Mit Google starten
          </a>
          <a
            href="/docs"
            className="mt-8 ml-3 inline-flex rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Dokumentation
          </a>
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Öffentliche #alle Events</h2>
          <div className="mt-3 space-y-2">
            {publicAlleEvents.length === 0 ? <p className="text-sm text-slate-500">Aktuell keine #alle Events.</p> : null}
            {publicAlleEvents.map((event) => (
              <article key={event.id} className="rounded-lg border border-slate-200 p-3">
                <a
                  href={`/e/${shortenUUID(event.id)}`}
                  className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
                >
                  {event.title}
                </a>
                <p className="text-xs text-slate-500">
                  {new Date(event.startsAt).toLocaleString("de-DE")} - {new Date(event.endsAt).toLocaleTimeString("de-DE")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return <Dashboard userName={session.user.name ?? session.user.email} />;
}
