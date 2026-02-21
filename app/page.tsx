import { redirect } from "next/navigation";

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
      <main className="relative isolate overflow-hidden bg-teal-900 text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(77,129,114,0.34),_transparent_42%),radial-gradient(circle_at_80%_20%,_rgba(199,107,79,0.24),_transparent_36%),linear-gradient(160deg,#1E3A34_0%,#254842_48%,#2F5D50_100%)]" />

        <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-20">
          <header
            className="realite-reveal flex flex-col gap-3 rounded-3xl border border-white/15 bg-white/5 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5 sm:py-3"
            style={{ animationDelay: "40ms" }}
          >
            <a
              href="/"
              className="text-center text-lg font-black tracking-wide sm:text-left [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]"
            >
              REALITE
            </a>
            <nav className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <a
                href="/docs"
                className="rounded-full border border-white/20 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white/90 transition hover:border-white/40 hover:bg-white/10 sm:px-4 sm:text-xs"
              >
                Dokumentation
              </a>
              <a
                href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="rounded-full bg-amber-500 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-amber-400 sm:px-4 sm:text-xs"
              >
                Jetzt anmelden
              </a>
            </nav>
          </header>

          <div className="mt-10 grid items-start gap-8 sm:mt-12 lg:mt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="realite-reveal" style={{ animationDelay: "140ms" }}>
              <p className="realite-float inline-flex rounded-full border border-teal-300/30 bg-teal-300/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-100 sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                Reale Treffen & gemeinsame Aktivitäten
              </p>
              <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-6xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                Weniger Scrollen. Mehr echte Momente.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:mt-6 sm:text-lg">
                Realite bringt Menschen raus aus der digitalen Isolation und schafft echte, sinnstiftende
                Verbindungen im echten Leben. Unterstützt durch Technologie, die Nähe statt Distanz fördert.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 sm:w-auto"
                >
                  Kostenlos mit Google starten
                </a>
                <a
                  href="#so-funktioniert-es"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                >
                  So funktioniert&apos;s
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-200 sm:mt-8 sm:text-xs">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Kalenderbasiertes Matching</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Privatsphäre bei Interessen</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Fokus auf echtes Treffen</span>
              </div>
            </div>

            <aside
              className="realite-reveal rounded-2xl border border-white/15 bg-white/8 p-5 shadow-2xl shadow-black/30 backdrop-blur-sm sm:rounded-3xl sm:p-6"
              style={{ animationDelay: "240ms" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Live-Einblick</p>
              <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                Öffentliche Events
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {publicAlleEvents.length > 0
                  ? `${publicAlleEvents.length} offene Aktivitäten warten gerade auf neue Leute.`
                  : "Gerade wird das nächste Event vorbereitet. Starte jetzt und setze den ersten Impuls."}
              </p>
              <div className="mt-5 space-y-3">
                {publicAlleEvents.slice(0, 3).map((event) => (
                  <article key={event.id} className="rounded-xl border border-white/15 bg-slate-900/70 p-4 sm:rounded-2xl">
                    <a href={`/e/${shortenUUID(event.id)}`} className="break-words font-semibold text-white hover:text-teal-200">
                      {event.title}
                    </a>
                    <p className="mt-1 text-xs text-slate-300">
                      {new Date(event.startsAt).toLocaleString("de-DE")} bis{" "}
                      {new Date(event.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </article>
                ))}
                {publicAlleEvents.length === 0 ? (
                  <article className="rounded-2xl border border-dashed border-white/20 bg-slate-900/50 p-4 text-sm text-slate-300">
                    Noch keine öffentlichen Events vorhanden.
                  </article>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        <section id="so-funktioniert-es" className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {[
              {
                title: "1. Anmelden",
                text: "Melde dich in Sekunden mit Google an und verbinde deinen Kalender."
              },
              {
                title: "2. Teilen",
                text: "Erstelle oder entdecke Events und halte Interessen privat."
              },
              {
                title: "3. Treffen",
                text: "Realite zeigt dir passende Vorschläge, damit aus Matches echte Treffen werden."
              }
            ].map((step, index) => (
              <article
                key={step.title}
                className="realite-reveal rounded-2xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm sm:rounded-3xl sm:p-6"
                style={{ animationDelay: `${280 + index * 120}ms` }}
              >
                <h3 className="text-lg font-bold text-white sm:text-xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-200">{step.text}</p>
              </article>
            ))}
          </div>
          <div
            className="realite-reveal mt-8 rounded-2xl border border-teal-300/20 bg-teal-300/10 p-5 sm:mt-10 sm:rounded-3xl sm:p-8"
            style={{ animationDelay: "680ms" }}
          >
            <h2 className="text-xl font-black text-white sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              Realite ist kein weiterer Feed. Es ist ein Startpunkt für echte Verbindung.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-teal-100 sm:text-base">
              Statt endlosen Chats bekommst du konkrete Vorschläge, die in deinen Alltag passen. Du entscheidest
              schnell, triffst dich real und baust echte Beziehungen auf.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-400"
              >
                Jetzt kostenlos anmelden
              </a>
              <a
                href="/docs/schnellstart"
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Schnellstart lesen
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const hasSuggestionFlow = query.has("suggestion") || query.has("decision");
  const baseTarget = hasSuggestionFlow ? "/suggestions" : "/events";
  const redirectTarget = query.toString() ? `${baseTarget}?${query.toString()}` : baseTarget;
  redirect(redirectTarget as never);
}
