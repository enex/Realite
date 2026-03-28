import { redirect } from "next/navigation";

import { EventImage } from "@/src/components/event-image";
import { LandingDatingGate } from "@/src/components/landing-dating-gate";
import { getAuthSession } from "@/src/lib/auth";
import { APP_SHELL_SECTIONS } from "@/src/lib/app-shell-navigation";
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
      <main className="relative isolate overflow-hidden bg-[#0d2218] text-white min-h-dvh">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_45%_at_50%_-5%,rgba(245,158,11,0.07),transparent),radial-gradient(ellipse_55%_35%_at_85%_15%,rgba(16,185,129,0.1),transparent),radial-gradient(ellipse_40%_25%_at_10%_60%,rgba(56,189,148,0.06),transparent),linear-gradient(180deg,#0d2218_0%,#112b1e_25%,#14332380%,#0d2218_100%)]" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-5 sm:px-6 sm:pb-24 sm:pt-7 lg:px-8 lg:pb-28 lg:pt-8">
          <LandingHeader signInHref={signInHref} />
          <HeroSection signInHref={signInHref} publicAlleEvents={publicAlleEvents} />
          <ProblemSection signInHref={signInHref} />
          <ComparisonSection />
          <SolutionSection />
          <CoreConceptsSection />
          <ProductFlowSection />
          <LandingDatingGate>
            <DatingSpotlightSection />
          </LandingDatingGate>
          <AudienceSection />
          <HowItWorksSection signInHref={signInHref} />
        </div>
      </main>
    );
  }

  const hasSuggestionFlow = query.has("suggestion") || query.has("decision");
  const baseTarget = hasSuggestionFlow ? "/suggestions" : "/now";
  const redirectTarget = query.toString() ? `${baseTarget}?${query.toString()}` : baseTarget;
  redirect(redirectTarget as never);
}

type PublicAlleEvent = Awaited<ReturnType<typeof listPublicAlleEvents>>[number];

function LandingHeader({ signInHref }: { signInHref: string }) {
  return (
    <header
      className="realite-reveal flex flex-col gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5 sm:py-2.5"
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
          ✦ Kostenlos · Kein Download nötig
        </p>
        <h1 className="mt-6 max-w-2xl text-[2rem] font-black leading-[1.15] tracking-tight text-white sm:mt-8 sm:text-5xl sm:leading-[1.1] lg:text-6xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Weniger organisieren. Mehr zusammen erleben.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:mt-5 sm:text-lg sm:leading-8">
          47 Nachrichten im Gruppenthread – und am Ende trifft sich trotzdem niemand. Realite macht aus einem freien Abend ein echtes Erlebnis, direkt mit deinen Leuten.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={signInHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            Kostenlos starten
          </a>
          <a
            href="#so-funktioniert-es"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-white/35 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 active:bg-white/5 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            So funktioniert&apos;s
          </a>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> Kalender bleibt privat</span>
          <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> Kein Spam an Kontakte</span>
          <span className="flex items-center gap-1.5"><span className="text-teal-400">✓</span> In 30 Sekunden dabei</span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Aktuell startet die Anmeldung über Google. Weitere Login-Pfade sollen später gleichwertig anschließen.
        </p>
      </div>

      <aside
        className="realite-reveal rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-xl shadow-black/40 backdrop-blur-sm sm:rounded-3xl sm:p-6"
        style={{ animationDelay: "240ms" }}
      >
        <img
          src="/landing/hero-connection.svg"
          alt="Menschen treffen sich für gemeinsame Aktivitäten"
          className="h-44 w-full rounded-xl border border-white/10 object-cover sm:h-48"
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
              <article key={event.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20 sm:rounded-2xl">
                {coverUrl ? (
                  <a href={`/e/${shortenUUID(event.id)}`} className="block h-24 w-full sm:h-28">
                    <EventImage src={coverUrl} className="h-full w-full object-cover" />
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
            <article className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm text-slate-300">
              Noch keine öffentlichen Events vorhanden.
            </article>
          ) : null}
        </div>
      </aside>
    </section>
  );
}

const PROBLEM_POINTS = [
  {
    icon: "💬",
    title: "Zu viel Abstimmung in Chats",
    text: "30 Nachrichten, 3 Terminvorschläge, 2 Absagen – und am Ende macht keiner was. Statt endlos zu schreiben, siehst du direkt, was bei deinen Leuten geht.",
    cta: "So löst Realite das →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "❓",
    title: "Man weiß nicht, wer Zeit hat",
    text: "Immer wieder scheitern Pläne nicht am Wollen, sondern am Timing. Realite macht freie Momente sichtbar, bevor du überhaupt fragst.",
    cta: "Jetzt ausprobieren →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "⏳",
    title: "Spontane Treffen passieren zu selten",
    text: "Spontanität stirbt in der Gruppenkonversation. Starte in Sekunden eine Aktivität – wer Zeit hat, stößt einfach dazu.",
    cta: "Jetzt starten →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "📱",
    title: "Viele Kontakte, aber wenig echte Erlebnisse",
    text: "Du kennst genug Leute. Zwischen freien Abenden, Gruppen und Ideen fehlt oft nur die Koordinationsschicht dazwischen.",
    cta: "Mehr Erlebnisse →",
    href: "#",
    useSignIn: true
  }
] as const;

function ProblemSection({ signInHref }: { signInHref: string }) {
  return (
    <section className="mt-12 sm:mt-14 lg:mt-16" aria-labelledby="was-du-tun-kannst">
      <div className="realite-reveal" style={{ animationDelay: "260ms" }}>
        <p className="inline-flex rounded-full border border-red-400/30 bg-red-900/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-300">
          Klingt bekannt?
        </p>
        <h2 id="was-du-tun-kannst" className="mt-3 text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Social Media hat dieses Problem nicht gelöst.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
          Instagram zeigt dir das Leben der anderen. WhatsApp lässt dich endlos koordinieren. Keines davon bringt euch wirklich zusammen.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
        {PROBLEM_POINTS.map((option, index) => (
          <article
            key={option.title}
            className="realite-reveal flex flex-col rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 shadow-lg shadow-black/30 backdrop-blur-sm sm:rounded-3xl sm:p-5"
            style={{ animationDelay: `${320 + index * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-xl border border-rose-500/20" aria-hidden="true">{option.icon}</span>
              <h3 className="text-base font-bold text-white sm:text-lg [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {option.title}
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">{option.text}</p>
            <a
              href={option.useSignIn ? signInHref : option.href}
              className="mt-4 inline-flex w-fit items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/15 hover:text-white"
            >
              {option.cta}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="mt-12 sm:mt-14">
      <div className="realite-reveal grid gap-4 sm:grid-cols-2" style={{ animationDelay: "340ms" }}>
        <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/60 to-red-900/20 p-5 shadow-lg shadow-rose-950/20 sm:rounded-3xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-300">😩 Bisher</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-rose-100/80">
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-400">✗</span>30+ Nachrichten für ein einziges Treffen</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-400">✗</span>Keiner weiß, wer gerade Zeit hat</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-400">✗</span>Spontanität stirbt in der Abstimmung</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-400">✗</span>Apps, die Fremde statt Freunde zeigen</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-400/35 bg-gradient-to-br from-emerald-950/60 to-teal-900/30 p-5 shadow-lg shadow-emerald-950/20 sm:rounded-3xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">✨ Mit Realite</p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-emerald-50/90">
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>Aktivität in Sekunden erstellt, Freunde sehen sie sofort</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>Sichtbar, wer gerade frei und dabei ist</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>Einfach dazustoßen – kein langer Chat</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-400">✓</span>Dein Freundeskreis – kein Fremde-Leute-Feed</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const SOLUTION_CARDS = [
  {
    icon: "👀",
    iconBg: "bg-sky-500/20 border-sky-400/25",
    title: "Sieh, was bei deinen Leuten geht",
    text: "Realite verbindet dein bestehendes Leben mit echter sozialer Interaktion. Du siehst, was gerade passiert – und kannst einfach dazustoßen.",
    image: "/landing/new-people.svg",
    imageAlt: "Illustration für neue Bekanntschaften"
  },
  {
    icon: "⚡",
    iconBg: "bg-amber-500/20 border-amber-400/25",
    title: "Aktivität in Sekunden starten",
    text: "Manuell oder aus einem Kalendertermin heraus – mit einem Marker wie #real wird daraus eine Einladung für deine Leute.",
    image: "/landing/reconnect.svg",
    imageAlt: "Illustration für das Wiederverbinden mit Kontakten"
  },
  {
    icon: "🙌",
    iconBg: "bg-emerald-500/20 border-emerald-400/25",
    title: "Spontan dazustoßen statt ewig schreiben",
    text: "Freunde und passende Leute sehen deine Aktivität und können direkt beitreten oder reagieren. Ein Klick – und ihr seid dabei.",
    image: "/landing/start-anything.svg",
    imageAlt: "Illustration für spontane gemeinsame Aktivitäten"
  }
] as const;

function SolutionSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal" style={{ animationDelay: "300ms" }}>
        <p className="inline-flex rounded-full border border-teal-400/40 bg-teal-700/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-100">
          Die Lösung
        </p>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Aus Plänen werden echte Erlebnisse.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
          Nicht noch eine Social-App. Realite ist die Koordinationsschicht, die fehlt: bestehende Kontakte aktivieren, spontane Chancen sichtbar machen, soziale Hürden abbauen.
        </p>
      </div>
      <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-3">
        {SOLUTION_CARDS.map((card, index) => (
          <article
            key={card.title}
            className="realite-reveal overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 shadow-lg shadow-black/30 backdrop-blur-sm sm:rounded-3xl sm:p-5"
            style={{ animationDelay: `${380 + index * 100}ms` }}
          >
            <div className={`flex h-40 w-full items-center justify-center rounded-xl border text-5xl sm:h-44 ${card.iconBg}`}>
              {card.icon}
            </div>
            <h3 className="mt-4 text-lg font-bold text-white [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const CORE_CONCEPTS = [
  {
    icon: "📅",
    iconBg: "bg-sky-500/20 border-sky-400/20",
    title: "Kalender als Input, nicht als Feed",
    text: "Realite nutzt deinen Kalender nur als Kontext. Es erkennt freie Slots oder markierte Termine – nichts wird automatisch veröffentlicht."
  },
  {
    icon: "🔒",
    iconBg: "bg-violet-500/20 border-violet-400/20",
    title: "Explizite Freigabe statt Automatik",
    text: "Du entscheidest, was sichtbar wird. Keine stillen Veröffentlichungen, kein Kontrollverlust. Punkt."
  },
  {
    icon: "⚡",
    iconBg: "bg-amber-500/20 border-amber-400/20",
    title: "Aktivität statt Chat",
    text: "Fokus auf konkreten, joinbaren Aktivitäten: weniger schreiben, direkt handeln. Das ist der Unterschied."
  },
  {
    icon: "🫂",
    iconBg: "bg-pink-500/20 border-pink-400/20",
    title: "Social Circles statt Randomness",
    text: "Freunde, Freunde von Freunden, ausgewählte Gruppen – optional offen. Keine unangenehme Fremde-Leute-App-Dynamik."
  },
  {
    icon: "🙋",
    iconBg: "bg-emerald-500/20 border-emerald-400/20",
    title: "Joinbarkeit statt Planungsstress",
    text: "Beitreten, Anfrage senden oder Interesse zeigen – weniger Abstimmung, mehr Umsetzung."
  }
] as const;

function CoreConceptsSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal" style={{ animationDelay: "560ms" }}>
        <p className="inline-flex rounded-full border border-teal-400/40 bg-teal-700/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-100">
          Wie Realite funktioniert
        </p>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Kein Event-Portal. Kein Chat. Etwas Neues.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
          Realite ist die soziale Koordinationsschicht, die echte Treffen in den Alltag zurückbringt. Hier ist warum das anders ist:
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {CORE_CONCEPTS.map((concept, index) => (
          <article
            key={concept.title}
            className="realite-reveal rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 shadow-lg shadow-black/30 backdrop-blur-sm sm:rounded-3xl"
            style={{ animationDelay: `${640 + index * 90}ms` }}
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${concept.iconBg}`} aria-hidden="true">{concept.icon}</span>
            <h3 className="mt-3 text-base font-bold text-white sm:text-lg [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {concept.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{concept.text}</p>
          </article>
        ))}
      </div>
      <div className="realite-reveal mt-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-5 sm:mt-8 sm:rounded-3xl sm:p-6" style={{ animationDelay: "1100ms" }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🔐</span>
          <h3 className="text-lg font-bold text-white [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">Datenschutz & Vertrauen</h3>
        </div>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-200 sm:grid-cols-2">
          <li className="flex items-center gap-2"><span className="text-teal-400">✓</span> Dein Kalender bleibt privat.</li>
          <li className="flex items-center gap-2"><span className="text-teal-400">✓</span> Kontakte werden nicht gespammt.</li>
          <li className="flex items-center gap-2"><span className="text-teal-400">✓</span> Keine automatischen Einträge bei anderen.</li>
          <li className="flex items-center gap-2"><span className="text-teal-400">✓</span> Volle Kontrolle über Sichtbarkeit.</li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-teal-100">Du entscheidest, was sozial wird.</p>
      </div>
    </section>
  );
}

function ProductFlowSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20" aria-labelledby="produktfluss">
      <div className="realite-reveal" style={{ animationDelay: "620ms" }}>
        <p className="inline-flex rounded-full border border-amber-400/35 bg-amber-900/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
          Produktfluss statt Linkliste
        </p>
        <h2
          id="produktfluss"
          className="mt-3 text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]"
        >
          Vier klare Wege statt einer chaotischen Eventliste.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
          Nach dem Login trennt Realite bewusst zwischen entdecken, reagieren und verwalten. So bleibt sofort klar,
          ob du gerade spontane Optionen prüfen, offene Empfehlungen beantworten oder deine Planung ordnen willst.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-4">
        {APP_SHELL_SECTIONS.map((section, index) => (
          <article
            key={section.href}
            className="realite-reveal rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-lg shadow-black/30 backdrop-blur-sm sm:rounded-3xl"
            style={{ animationDelay: `${700 + index * 80}ms` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/90">{section.intent}</p>
            <h3 className="mt-3 text-lg font-bold text-white [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {section.label}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-white">{section.focus}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{section.whenToUse}</p>
          </article>
        ))}
      </div>
      <div
        className="realite-reveal mt-6 rounded-2xl border border-white/[0.08] bg-black/20 p-5 text-sm leading-6 text-slate-200 sm:mt-8 sm:rounded-3xl sm:p-6"
        style={{ animationDelay: "1060ms" }}
      >
        <span className="font-semibold text-white">Wichtig:</span> <strong>Events</strong> bleibt deine persönliche
        Planungs- und Kalenderansicht. <strong>Gruppen</strong> bleibt der Ort für Kreise, Einladungen und
        Sichtbarkeit. Realite trennt beides absichtlich, damit Verwaltung nicht wie Discovery aussieht.
      </div>
    </section>
  );
}

function DatingSpotlightSection() {
  return (
    <section className="mt-12 sm:mt-14">
      <article
        className="realite-reveal overflow-hidden rounded-2xl border border-amber-600/30 bg-[linear-gradient(145deg,rgba(180,90,30,0.30),rgba(20,40,32,0.75))] p-5 shadow-xl shadow-black/30 sm:rounded-3xl sm:p-6"
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
              Wenn du willst, kannst du über{" "}
              <span className="rounded bg-amber-800/50 px-1.5 py-0.5 font-mono text-[13px] text-amber-200">#date</span>{" "}
              auch Dating-Matches erhalten. Der Bereich bleibt bewusst kompakt und ist nur ein Zusatz zu normalen Treffen.
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

const PERSONAS = [
  {
    emoji: "🏃",
    cardBg: "border-orange-500/20 bg-gradient-to-br from-orange-950/30 to-transparent",
    emojiBg: "bg-orange-500/20 border-orange-400/25",
    label: "Der Spontane",
    text: "Du hast heute Abend frei und willst einfach loslegen – ohne stundenlangen Chat. Realite zeigt dir sofort, wer dabei ist."
  },
  {
    emoji: "📅",
    cardBg: "border-sky-500/20 bg-gradient-to-br from-sky-950/30 to-transparent",
    emojiBg: "bg-sky-500/20 border-sky-400/25",
    label: "Der Planer",
    text: "Du hast bereits Termine. Realite hilft dir, daraus echte Einladungen für deine Leute zu machen – mit einem Marker."
  },
  {
    emoji: "🤝",
    cardBg: "border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-transparent",
    emojiBg: "bg-violet-500/20 border-violet-400/25",
    label: "Der Verbinder",
    text: "Du kennst viele Leute, aber trefft euch zu selten. Realite aktiviert deinen Freundeskreis, ohne Druck."
  },
  {
    emoji: "🌱",
    cardBg: "border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-transparent",
    emojiBg: "bg-emerald-500/20 border-emerald-400/25",
    label: "Der Offene",
    text: "Du bist offen für neue Kontakte – aber nicht über eine Fremde-Leute-App. Realite verbindet dich über gemeinsame Kreise."
  }
] as const;

function AudienceSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal" style={{ animationDelay: "1180ms" }}>
        <h2 className="text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Für wen ist Realite?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
          Für alle, die mehr aus ihrem sozialen Leben herausholen wollen – ohne mehr Zeit in Apps zu verbringen.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
        {PERSONAS.map((persona, index) => (
          <article
            key={persona.label}
            className={`realite-reveal rounded-2xl border p-5 shadow-lg shadow-black/25 backdrop-blur-sm sm:rounded-3xl ${persona.cardBg}`}
            style={{ animationDelay: `${1200 + index * 80}ms` }}
          >
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border text-2xl ${persona.emojiBg}`} aria-hidden="true">{persona.emoji}</span>
            <h3 className="mt-3 text-base font-bold text-white [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {persona.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{persona.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Loslegen",
    badge: "Kalender optional",
    text: "Starte direkt mit Aktivität, Gruppen und Vorschlägen. Kalender und Kontakte ergänzen später mehr Kontext, bleiben aber deine bewusste Entscheidung."
  },
  {
    step: "02",
    title: "Aktivität erstellen",
    badge: "10 Sekunden",
    text: "Manuell oder aus einem Termin heraus – mit Marker wie #real und eigenen Join-Regeln. Fertig."
  },
  {
    step: "03",
    title: "Zusammenkommen",
    badge: "Das Ziel",
    text: "Freunde und passende Leute sehen deine Aktivität und können direkt beitreten oder anfragen. Aus Plan wird Erlebnis."
  }
] as const;

function HowItWorksSection({ signInHref }: { signInHref: string }) {
  return (
    <section id="so-funktioniert-es" className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal mb-6 sm:mb-8" style={{ animationDelay: "820ms" }}>
        <p className="inline-flex rounded-full border border-teal-400/40 bg-teal-700/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-100">
          So einfach geht&apos;s
        </p>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          In 3 Schritten zum ersten echten Erlebnis.
        </h2>
      </div>
      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <article
            key={step.title}
            className="realite-reveal relative rounded-2xl border border-white/[0.07] bg-white/[0.035] p-5 shadow-lg shadow-black/30 backdrop-blur-sm sm:rounded-3xl sm:p-6"
            style={{ animationDelay: `${840 + index * 120}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-5xl font-black leading-none text-amber-400/70 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {step.step}
              </span>
              <span className="rounded-full border border-amber-500/25 bg-amber-900/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                {step.badge}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white sm:text-xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{step.text}</p>
          </article>
        ))}
      </div>

      <div
        className="realite-reveal mt-10 overflow-hidden rounded-2xl border border-amber-500/25 bg-[linear-gradient(135deg,rgba(146,64,14,0.45)_0%,rgba(20,50,38,0.95)_60%)] p-6 shadow-xl shadow-amber-950/30 sm:mt-12 sm:rounded-3xl sm:p-10"
        style={{ animationDelay: "1220ms" }}
      >
        <p className="inline-flex rounded-full border border-amber-400/30 bg-amber-900/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
          Jetzt kostenlos starten
        </p>
        <h2 className="mt-4 max-w-2xl text-2xl font-black text-white sm:text-3xl lg:text-4xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Dein nächstes spontanes Treffen ist einen Klick entfernt.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-teal-100 sm:text-lg">
          Kostenlos, kein Download, in 30 Sekunden dabei. Und dein Kalender bleibt privat.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={signInHref}
            className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-amber-900/40 transition hover:-translate-y-0.5 hover:bg-amber-400 active:translate-y-0 active:bg-amber-600 sm:min-h-0 sm:py-3.5"
          >
            Kostenlos starten →
          </a>
          <a
            href="/docs/schnellstart"
            className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-base font-semibold text-white/90 transition hover:bg-white/10 active:bg-white/5 sm:min-h-0 sm:py-3.5"
          >
            Schnellstart lesen
          </a>
        </div>
        <p className="mt-5 text-xs text-slate-400">Keine Kreditkarte · Kein Spam · Aktuell per Google-Login, Kalender später optional</p>
      </div>
    </section>
  );
}
