import { redirect } from "next/navigation";

import { LandingDatingBadge, LandingDatingGate } from "@/src/components/landing-dating-gate";
import { getAuthSession } from "@/src/lib/auth";
import { listPublicAlleEvents } from "@/src/lib/repository";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

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
  const signInHref = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  if (!session?.user.email) {
    const publicAlleEvents = await listPublicAlleEvents(8);

    return (
      <main className="relative isolate overflow-hidden bg-teal-900 text-white min-h-dvh">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(77,129,114,0.35),transparent),linear-gradient(180deg,#1E3A34_0%,#223d38_35%,#254842_70%,#2a5248_100%)]" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-7 lg:px-8 lg:pb-28 lg:pt-8">
          <LandingHeader signInHref={signInHref} />
          <HeroSection signInHref={signInHref} publicAlleEvents={publicAlleEvents} />
          <PeopleIntentSection />
          <LandingDatingGate>
            <DatingSpotlightSection />
          </LandingDatingGate>
          <HowItWorksSection signInHref={signInHref} />
        </div>
      </main>
    );
  }

  const hasSuggestionFlow = query.has("suggestion") || query.has("decision");
  const baseTarget = hasSuggestionFlow ? "/suggestions" : "/events";
  const redirectTarget = query.toString() ? `${baseTarget}?${query.toString()}` : baseTarget;
  redirect(redirectTarget as never);
}

type PublicAlleEvent = Awaited<ReturnType<typeof listPublicAlleEvents>>[number];

function LandingHeader({ signInHref }: { signInHref: string }) {
  return (
    <header
      className="realite-reveal flex flex-col gap-3 rounded-2xl border border-teal-700/60 bg-teal-800/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5 sm:py-2.5"
      style={{ animationDelay: "40ms" }}
    >
      <a
        href="/"
        className="text-center text-lg font-black tracking-wide sm:text-left [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]"
      >
        REALITE
      </a>
      <nav className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
        <a
          href="/docs"
          className="rounded-full border border-white/25 px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-white/95 transition hover:border-white/40 hover:bg-white/10 sm:px-4 sm:py-2"
        >
          Dokumentation
        </a>
        <a
          href={signInHref}
          className="rounded-full bg-amber-500 px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-white transition hover:bg-amber-400 active:bg-amber-600 sm:px-4 sm:py-2"
        >
          Jetzt anmelden
        </a>
      </nav>
    </header>
  );
}

function HeroSection({ signInHref, publicAlleEvents }: { signInHref: string; publicAlleEvents: PublicAlleEvent[] }) {
  return (
    <section className="mt-8 grid items-start gap-10 sm:mt-12 sm:gap-12 lg:mt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
      <div className="realite-reveal min-w-0" style={{ animationDelay: "140ms" }}>
        <p className="realite-float inline-flex rounded-full border border-teal-400/40 bg-teal-700/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-100 sm:px-4 sm:text-xs sm:tracking-[0.16em]">
          Reale Treffen statt endloser Feeds
        </p>
        <h1 className="mt-6 max-w-2xl text-[2rem] font-black leading-[1.15] tracking-tight text-white sm:mt-8 sm:text-5xl sm:leading-[1.1] lg:text-6xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Finde Menschen, die wirklich zu deinem Alltag passen.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
          Echte Gesichter, echte Orte. Egal ob neue Leute kennenlernen, Kontakte wiederbeleben oder einfach wieder mehr
          rausgehen – Realite macht aus deiner Zeit und deinen Interessen konkrete Treffen.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={signInHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            Kostenlos mit Google starten
          </a>
          <a
            href="#so-funktioniert-es"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/35 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 active:bg-white/5 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            So funktioniert&apos;s
          </a>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-slate-300 sm:mt-9">
          <span className="rounded-lg border border-white/20 bg-teal-800/60 px-3 py-1.5">Neue Leute</span>
          <span className="rounded-lg border border-white/20 bg-teal-800/60 px-3 py-1.5">Reconnecten</span>
          <LandingDatingBadge />
        </div>
      </div>

      <aside
        className="realite-reveal rounded-2xl border border-teal-700/50 bg-teal-800/80 p-5 shadow-xl shadow-black/25 sm:rounded-3xl sm:p-6"
        style={{ animationDelay: "240ms" }}
      >
        <img
          src="/landing/hero-connection.svg"
          alt="Menschen treffen sich für gemeinsame Aktivitäten"
          className="h-44 w-full rounded-xl border border-teal-700/50 object-cover sm:h-48"
          loading="lazy"
        />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Live vor Ort</p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Offene Events
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          {publicAlleEvents.length > 0
            ? `${publicAlleEvents.length} offene Aktivität(en) warten gerade auf neue Leute.`
            : "Gerade wird das nächste Event vorbereitet. Starte jetzt und setze den ersten Impuls."}
        </p>
        <div className="mt-5 space-y-3">
          {publicAlleEvents.slice(0, 3).map((event) => {
            const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
            return (
              <article key={event.id} className="overflow-hidden rounded-xl border border-teal-700/50 bg-teal-900/80 sm:rounded-2xl">
                {coverUrl ? (
                  <a href={`/e/${shortenUUID(event.id)}`} className="block h-24 w-full sm:h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : null}
                <div className="p-4">
                  <a href={`/e/${shortenUUID(event.id)}`} className="wrap-break-word font-semibold text-white hover:text-teal-200">
                    {event.title.replace(/#[^\s]+/gi, "").trim()}
                  </a>
                  <p className="mt-1 text-xs text-slate-300">
                    {new Date(event.startsAt).toLocaleString("de-DE")} bis{" "}
                    {new Date(event.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </article>
            );
          })}
          {publicAlleEvents.length === 0 ? (
            <article className="rounded-2xl border border-dashed border-teal-600/40 bg-teal-900/50 p-4 text-sm text-slate-300">
              Noch keine öffentlichen Events vorhanden.
            </article>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

const INTENT_CARDS = [
  {
    title: "Neue Leute kennenlernen",
    text: "Finde Menschen mit ähnlichen Interessen in deiner Nähe.",
    image: "/landing/new-people.svg",
    imageAlt: "Illustration für neue Bekanntschaften"
  },
  {
    title: "Reconnecten",
    text: "Reaktiviere lose Kontakte und komm wieder ins gemeinsame Tun.",
    image: "/landing/reconnect.svg",
    imageAlt: "Illustration für das Wiederverbinden mit Kontakten"
  },
  {
    title: "Einfach was starten",
    text: "Sport, Spaziergang, Kaffee oder Lernen: du gibst den Impuls.",
    image: "/landing/start-anything.svg",
    imageAlt: "Illustration für spontane gemeinsame Aktivitäten"
  }
] as const;

function PeopleIntentSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal" style={{ animationDelay: "300ms" }}>
        <h2 className="text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Für jeden Startpunkt.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
          Du musst nicht wissen, wonach du exakt suchst. Fang einfach mit dem an, was sich für dich jetzt richtig
          anfühlt.
        </p>
      </div>
      <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-3">
        {INTENT_CARDS.map((card, index) => (
          <article
            key={card.title}
            className="realite-reveal overflow-hidden rounded-2xl border border-teal-700/50 bg-teal-800/70 p-4 shadow-lg shadow-black/20 sm:rounded-3xl sm:p-5"
            style={{ animationDelay: `${380 + index * 100}ms` }}
          >
            <img
              src={card.image}
              alt={card.imageAlt}
              className="h-40 w-full rounded-xl border border-teal-700/40 object-cover sm:h-44"
              loading="lazy"
            />
            <h3 className="mt-4 text-lg font-bold text-white [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DatingSpotlightSection() {
  return (
    <section className="mt-12 sm:mt-14">
      <article
        className="realite-reveal overflow-hidden rounded-2xl border border-amber-800/40 bg-[linear-gradient(145deg,rgba(150,80,55,0.35),rgba(37,72,66,0.6))] p-5 shadow-xl shadow-black/20 sm:rounded-3xl sm:p-6"
        style={{ animationDelay: "700ms" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div>
            <p className="inline-flex rounded-lg border border-amber-200/30 bg-amber-900/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100 sm:text-xs">
              Optional: Dating
            </p>
            <h3 className="mt-4 text-xl font-black text-white sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              Kleine Date-Ecke, ohne Druck.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-amber-50/95 sm:text-base">
              Wenn du willst, kannst du über `#date` auch Dating-Matches erhalten. Der Bereich bleibt bewusst kompakt
              und ist nur ein Zusatz zu normalen Treffen.
            </p>
            <a
              href="/docs/events-und-matching"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/35 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 active:bg-white/5 sm:min-h-0"
            >
              Mehr zum Matching
            </a>
          </div>
          <img
            src="/landing/dating-spotlight.svg"
            alt="Dating als optionale Funktion in Realite"
            className="h-32 w-full rounded-xl border border-amber-800/30 object-cover sm:h-36 sm:w-52"
            loading="lazy"
          />
        </div>
      </article>
    </section>
  );
}

function HowItWorksSection({ signInHref }: { signInHref: string }) {
  return (
    <section id="so-funktioniert-es" className="mt-14 sm:mt-16 lg:mt-20">
      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {[
          {
            title: "1. Anmelden",
            text: "In Sekunden mit Google anmelden und Kalender verbinden."
          },
          {
            title: "2. Teilen",
            text: "Events erstellen oder entdecken, Interessen bleiben privat."
          },
          {
            title: "3. Treffen",
            text: "Passende Vorschläge annehmen und aus Matches reale Momente machen."
          }
        ].map((step, index) => (
          <article
            key={step.title}
            className="realite-reveal rounded-2xl border border-teal-700/50 bg-teal-800/60 p-5 shadow-lg shadow-black/15 sm:rounded-3xl sm:p-6"
            style={{ animationDelay: `${840 + index * 120}ms` }}
          >
            <h3 className="text-lg font-bold text-white sm:text-xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">{step.text}</p>
          </article>
        ))}
      </div>
      <div
        className="realite-reveal mt-10 rounded-2xl border border-teal-400/25 bg-teal-700/50 p-6 shadow-xl shadow-black/20 sm:mt-12 sm:rounded-3xl sm:p-8"
        style={{ animationDelay: "1220ms" }}
      >
        <h2 className="text-xl font-black text-white sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Kein weiterer Feed. Ein klarer Startpunkt für echte Verbindung.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-teal-100 sm:text-lg">
          Du bekommst konkrete Vorschläge, entscheidest schnell und triffst Menschen im echten Leben.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={signInHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-amber-500 px-6 py-3.5 text-base font-bold text-white transition hover:bg-amber-400 active:bg-amber-600 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            Jetzt kostenlos anmelden
          </a>
          <a
            href="/docs/schnellstart"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/35 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 active:bg-white/5 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            Schnellstart lesen
          </a>
        </div>
      </div>
    </section>
  );
}
