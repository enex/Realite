import { redirect } from "next/navigation";

import { EventImage } from "@/src/components/event-image";
import { LandingDatingGate } from "@/src/components/landing-dating-gate";
import { getAuthSession } from "@/src/lib/auth";
import { APP_SHELL_SECTIONS } from "@/src/lib/app-shell-navigation";
import { buildLoginPath } from "@/src/lib/provider-adapters";
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
  const signInHref = buildLoginPath(callbackUrl);

  if (!session?.user.email) {
    const publicAlleEvents = await listPublicAlleEvents(8);

    return (
      <main className="relative isolate min-h-dvh overflow-hidden bg-[#f6f0e6] text-slate-950">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_45%_at_50%_-10%,rgba(251,191,36,0.18),transparent),radial-gradient(ellipse_55%_35%_at_90%_20%,rgba(16,185,129,0.10),transparent),radial-gradient(ellipse_45%_28%_at_8%_62%,rgba(244,114,182,0.08),transparent),linear-gradient(180deg,#f6f0e6_0%,#f5f3ec_30%,#eef6f1_68%,#f7f4ee_100%)]" />
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
      className="realite-reveal flex flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-white/78 px-4 py-3.5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-5 sm:py-2.5"
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
          className="rounded-full border border-emerald-950/15 px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-slate-700 transition hover:border-emerald-950/25 hover:bg-emerald-950/5 sm:px-4 sm:py-2"
        >
          Dokumentation
        </a>
        <a
          href={signInHref}
          className="rounded-full bg-emerald-900 px-4 py-2.5 text-center text-xs font-semibold tracking-wide text-white transition hover:bg-emerald-800 active:bg-emerald-950 sm:px-4 sm:py-2"
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
        <p className="realite-float inline-flex rounded-full border border-emerald-900/10 bg-white/82 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900 sm:px-4 sm:text-xs sm:tracking-[0.16em]">
          ✦ Kostenlos · Kein Download nötig
        </p>
        <h1 className="mt-6 max-w-2xl text-[2rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:mt-8 sm:text-5xl sm:leading-[1.05] lg:text-6xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Weniger organisieren. Mehr zusammen erleben.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:mt-5 sm:text-lg sm:leading-8">
          47 Nachrichten im Gruppenthread – und am Ende trifft sich trotzdem niemand. Realite macht aus einem freien Abend ein echtes Erlebnis, direkt mit deinen Leuten.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={signInHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-900 px-6 py-3.5 text-base font-bold text-white shadow-[0_20px_45px_-28px_rgba(6,78,59,0.8)] transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            Kostenlos starten
          </a>
          <a
            href="#so-funktioniert-es"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-emerald-950/15 bg-white/72 px-6 py-3.5 text-base font-semibold text-slate-800 transition hover:bg-white active:bg-emerald-950/5 sm:min-h-0 sm:py-3 sm:text-sm"
          >
            So funktioniert&apos;s
          </a>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="text-emerald-700">✓</span> Kalender bleibt privat</span>
          <span className="flex items-center gap-1.5"><span className="text-emerald-700">✓</span> Kein Spam an Kontakte</span>
          <span className="flex items-center gap-1.5"><span className="text-emerald-700">✓</span> In 30 Sekunden dabei</span>
        </div>
      </div>

      <aside
        className="realite-reveal overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white/82 p-5 shadow-[0_30px_80px_-44px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-6"
        style={{ animationDelay: "240ms" }}
      >
        <img
          src="/landing/realite-hero-photo.png"
          alt="Freunde treffen sich spontan für eine gemeinsame Aktivität"
          className="h-52 w-full rounded-[22px] border border-emerald-950/10 bg-[#ebe4d5] object-cover sm:h-64"
          loading="lazy"
        />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/70">Live vor Ort</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Offene Events
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {publicAlleEvents.length > 0
            ? `${publicAlleEvents.length} offene Aktivität(en) warten gerade auf neue Leute.`
            : "Gerade wird das nächste Event vorbereitet. Starte jetzt und setze den ersten Impuls."}
        </p>
        <div className="mt-5 space-y-3">
          {publicAlleEvents.slice(0, 3).map((event) => {
            const coverUrl = event.placeImageUrl ?? event.linkPreviewImageUrl ?? null;
            return (
              <article key={event.id} className="overflow-hidden rounded-xl border border-emerald-950/10 bg-[#f8f4ec] sm:rounded-2xl">
                {coverUrl ? (
                  <a href={`/e/${shortenUUID(event.id)}`} className="block h-24 w-full sm:h-28">
                    <EventImage src={coverUrl} className="h-full w-full object-cover" />
                  </a>
                ) : null}
                <div className="p-4">
                  <a href={`/e/${shortenUUID(event.id)}`} className="wrap-break-word font-semibold text-slate-900 hover:text-emerald-800">
                    {event.title.replace(/#[^\s]+/gi, "").trim()}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(event.startsAt).toLocaleString("de-DE")} bis{" "}
                    {new Date(event.endsAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </article>
            );
          })}
          {publicAlleEvents.length === 0 ? (
            <article className="rounded-2xl border border-dashed border-emerald-950/15 bg-[#f8f4ec] p-4 text-sm text-slate-600">
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
    text: "30 Nachrichten später steht oft immer noch nichts. Statt endlos zu schreiben, siehst du direkt, was bei deinen Leuten geht.",
    cta: "So löst Realite das →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "❓",
    title: "Man weiß nicht, wer Zeit hat",
    text: "Pläne scheitern oft nicht am Wollen, sondern am Timing. Realite macht freie Momente sichtbar, bevor du überhaupt fragst.",
    cta: "Jetzt ausprobieren →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "⏳",
    title: "Spontane Treffen passieren zu selten",
    text: "Spontanität stirbt in der Gruppenkonversation. Starte in Sekunden eine Aktivität, und wer Zeit hat, stößt einfach dazu.",
    cta: "Jetzt starten →",
    href: "#",
    useSignIn: true
  },
  {
    icon: "📱",
    title: "Viele Kontakte, aber wenig echte Erlebnisse",
    text: "Du kennst genug Leute. Oft fehlt nur die Koordinationsschicht zwischen freiem Abend und echter Aktivität.",
    cta: "Mehr Erlebnisse →",
    href: "#",
    useSignIn: true
  }
] as const;

function ProblemSection({ signInHref }: { signInHref: string }) {
  return (
    <section className="mt-12 sm:mt-14 lg:mt-16" aria-labelledby="was-du-tun-kannst">
      <div className="realite-reveal" style={{ animationDelay: "260ms" }}>
        <p className="inline-flex rounded-full border border-rose-900/10 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
          Klingt bekannt?
        </p>
        <h2 id="was-du-tun-kannst" className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Social Media hat dieses Problem nicht gelöst.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
          Instagram zeigt dir das Leben der anderen. WhatsApp macht aus einem spontanen Plan schnell einen langen Abstimmungsthread.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5">
        {PROBLEM_POINTS.map((option, index) => (
          <article
            key={option.title}
            className="realite-reveal flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:rounded-3xl sm:p-5"
            style={{ animationDelay: `${320 + index * 80}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-xl border border-rose-500/20" aria-hidden="true">{option.icon}</span>
              <h3 className="text-base font-bold text-slate-950 sm:text-lg [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {option.title}
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{option.text}</p>
            <a
              href={option.useSignIn ? signInHref : option.href}
              className="mt-4 inline-flex w-fit items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-slate-950"
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
        <div className="rounded-2xl border border-rose-200 bg-white/74 p-5 shadow-[0_22px_60px_-40px_rgba(244,63,94,0.32)] sm:rounded-3xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-700">😩 Bisher</p>
          <ul className="mt-4 space-y-2.5 text-sm leading-6 text-rose-950/75">
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-500">✗</span>30+ Nachrichten für ein einziges Treffen</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-500">✗</span>Keiner weiß, wer gerade Zeit hat</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-500">✗</span>Spontanität stirbt in der Abstimmung</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-rose-500">✗</span>Apps, die Fremde statt Freunde zeigen</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-[#edf6f1] p-5 shadow-[0_22px_60px_-40px_rgba(16,185,129,0.35)] sm:rounded-3xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">✨ Mit Realite</p>
          <ul className="mt-4 space-y-2.5 text-sm leading-6 text-emerald-950/78">
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-600">✓</span>Aktivität in Sekunden erstellt, Freunde sehen sie sofort</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-600">✓</span>Sichtbar, wer gerade frei und dabei ist</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-600">✓</span>Einfach dazustoßen – kein langer Chat</li>
            <li className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 font-bold text-emerald-600">✓</span>Dein Freundeskreis – kein Fremde-Leute-Feed</li>
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
    image: "/landing/realite-discovery-photo.png",
    imageAlt: "Freunde entdecken spontan eine gemeinsame Aktivität"
  },
  {
    icon: "⚡",
    iconBg: "bg-amber-500/20 border-amber-400/25",
    title: "Aktivität in Sekunden starten",
    text: "Manuell oder aus einem Kalendertermin heraus – mit einem Marker wie #real wird daraus eine Einladung für deine Leute.",
    image: "/landing/realite-quick-start-photo.png",
    imageAlt: "Kleine Gruppe plant in wenigen Sekunden ein Treffen"
  },
  {
    icon: "🙌",
    iconBg: "bg-emerald-500/20 border-emerald-400/25",
    title: "Spontan dazustoßen statt ewig schreiben",
    text: "Freunde und passende Leute sehen deine Aktivität und können direkt beitreten oder reagieren. Ein Klick – und ihr seid dabei.",
    image: "/landing/realite-join-photo.png",
    imageAlt: "Freunde stoßen spontan zu einem Treffen dazu"
  }
] as const;

function SolutionSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="rounded-[32px] border border-white/50 bg-white/38 px-4 py-6 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.18)] backdrop-blur-[2px] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="realite-reveal" style={{ animationDelay: "300ms" }}>
          <p className="inline-flex rounded-full border border-emerald-900/10 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
            Die Lösung
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
            Aus Plänen werden echte Erlebnisse.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            Nicht noch eine Social-App. Realite aktiviert bestehende Kontakte, macht spontane Chancen sichtbar und senkt die Hürde, wirklich loszugehen.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 md:grid-cols-3">
          {SOLUTION_CARDS.map((card, index) => (
            <article
              key={card.title}
              className="realite-reveal overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.35)] backdrop-blur-sm sm:rounded-3xl sm:p-5"
              style={{ animationDelay: `${380 + index * 100}ms` }}
            >
              <div className="relative overflow-hidden rounded-[22px] border border-emerald-950/10 bg-[#efe8da]">
                <img src={card.image} alt={card.imageAlt} className="h-44 w-full object-cover sm:h-48" loading="lazy" />
                <span className={`absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border text-2xl shadow-sm ${card.iconBg}`} aria-hidden="true">
                  {card.icon}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
            </article>
          ))}
        </div>
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
        <p className="inline-flex rounded-full border border-emerald-900/10 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
          Wie Realite funktioniert
        </p>
        <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Kein Event-Portal. Kein Chat. Etwas Neues.
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
          Realite nutzt Kalender und Kontakte als Kontext, nicht als öffentlichen Feed. Genau das macht die App nützlich statt aufdringlich.
        </p>
      </div>
      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {CORE_CONCEPTS.map((concept, index) => (
          <article
            key={concept.title}
            className="realite-reveal rounded-2xl border border-slate-200 bg-white/76 p-5 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.30)] backdrop-blur-sm sm:rounded-3xl"
            style={{ animationDelay: `${640 + index * 90}ms` }}
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${concept.iconBg}`} aria-hidden="true">{concept.icon}</span>
            <h3 className="mt-3 text-base font-bold text-slate-950 sm:text-lg [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {concept.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{concept.text}</p>
          </article>
        ))}
      </div>
      <div className="realite-reveal mt-6 rounded-2xl border border-emerald-200 bg-[#edf6f1] p-5 sm:mt-8 sm:rounded-3xl sm:p-6" style={{ animationDelay: "1100ms" }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🔐</span>
          <h3 className="text-lg font-bold text-slate-950 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">Datenschutz & Vertrauen</h3>
        </div>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2">
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Dein Kalender bleibt privat.</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Kontakte werden nicht gespammt.</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Keine automatischen Einträge bei anderen.</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Volle Kontrolle über Sichtbarkeit.</li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-emerald-900">Du entscheidest, was sozial wird.</p>
      </div>
    </section>
  );
}

function ProductFlowSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20" aria-labelledby="produktfluss">
      <div className="rounded-[32px] border border-emerald-950/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(237,246,241,0.72))] px-4 py-6 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.16)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="realite-reveal" style={{ animationDelay: "620ms" }}>
          <p className="inline-flex rounded-full border border-amber-900/10 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800">
            Produktfluss statt Linkliste
          </p>
          <h2
            id="produktfluss"
            className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]"
          >
            Vier klare Wege statt einer chaotischen Eventliste.
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
            Nach dem Login trennt Realite bewusst zwischen entdecken, reagieren und verwalten. So bleibt sofort klar, was gerade dran ist.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2 xl:grid-cols-4">
          {APP_SHELL_SECTIONS.map((section, index) => (
            <article
              key={section.href}
              className="realite-reveal rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.30)] backdrop-blur-sm sm:rounded-3xl"
              style={{ animationDelay: `${700 + index * 80}ms` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800/80">{section.intent}</p>
              <h3 className="mt-3 text-lg font-bold text-slate-950 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {section.label}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{section.focus}</p>
              <p className="mt-2.5 text-sm leading-6 text-slate-600">{section.whenToUse}</p>
            </article>
          ))}
        </div>
        <div
          className="realite-reveal mt-6 rounded-2xl border border-slate-200 bg-white/72 p-5 text-sm leading-6 text-slate-700 sm:mt-8 sm:rounded-3xl sm:p-6"
          style={{ animationDelay: "1060ms" }}
        >
          <span className="font-semibold text-slate-950">Wichtig:</span> <strong>Events</strong> bleibt deine persönliche
          Planungs- und Kalenderansicht. <strong>Gruppen</strong> bleibt der Ort für Kreise, Einladungen und
          Sichtbarkeit. Realite trennt beides absichtlich, damit Verwaltung nicht wie Discovery aussieht.
        </div>
      </div>
    </section>
  );
}

function DatingSpotlightSection() {
  return (
    <section className="mt-12 sm:mt-14">
      <article
        className="realite-reveal overflow-hidden rounded-[28px] border border-amber-200 bg-[linear-gradient(145deg,rgba(255,247,237,0.96),rgba(254,243,199,0.72))] p-5 shadow-[0_24px_70px_-42px_rgba(180,83,9,0.45)] sm:p-6"
        style={{ animationDelay: "700ms" }}
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div className="order-2 lg:order-1">
            <p className="inline-flex rounded-lg border border-amber-300 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800 sm:text-xs">
              Optional: Dating
            </p>
            <h3 className="mt-4 text-xl font-black text-slate-950 sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              Kleine Date-Ecke, ohne Druck.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
              Wenn du willst, kannst du über{" "}
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[13px] text-amber-900">#date</span>{" "}
              auch Dating-Matches erhalten. Der Bereich bleibt bewusst kompakt und ist nur ein Zusatz zu normalen Treffen.
            </p>
            <a
              href="/docs/events-und-matching"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300 bg-white/65 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white active:bg-amber-50 sm:min-h-0"
            >
              Mehr zum Matching
            </a>
          </div>
          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-[24px] border border-amber-200/80 bg-white/70 shadow-[0_18px_50px_-34px_rgba(120,53,15,0.45)]">
              <img
                src="/landing/realite-join-photo.png"
                alt="Menschen treffen sich offen und ungezwungen bei einem Abend in der Stadt"
                className="h-52 w-full object-cover object-center sm:h-64"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

const AUDIENCE_STORIES = [
  {
    emoji: "🏃",
    label: "Der Spontane",
    text: "Du hast heute Abend frei und willst einfach loslegen – ohne stundenlangen Chat. Realite zeigt dir sofort, wer dabei ist."
  },
  {
    emoji: "📅",
    label: "Der Planer",
    text: "Du hast bereits Termine. Realite hilft dir, daraus echte Einladungen für deine Leute zu machen – mit einem Marker."
  },
  {
    emoji: "🤝",
    label: "Der Verbinder",
    text: "Du kennst viele Leute, aber trefft euch zu selten. Realite aktiviert deinen Freundeskreis, ohne Druck."
  },
  {
    emoji: "🌱",
    label: "Der Offene",
    text: "Du bist offen für neue Kontakte – aber nicht über eine Fremde-Leute-App. Realite verbindet dich über gemeinsame Kreise."
  }
] as const;

function AudienceSection() {
  return (
    <section className="mt-14 sm:mt-16 lg:mt-20">
      <div className="realite-reveal" style={{ animationDelay: "1180ms" }}>
        <h2 className="text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          Für wen ist Realite?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
          Für Leute, die mehr gemeinsam erleben wollen, ohne dafür noch mehr Zeit in Apps zu verbringen.
        </p>
      </div>
      <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <article
          className="realite-reveal overflow-hidden rounded-[28px] border border-slate-200 bg-white/80 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.28)]"
          style={{ animationDelay: "1220ms" }}
        >
          <img
            src="/landing/realite-discovery-photo.png"
            alt="Freunde begegnen sich entspannt im Alltag und verabreden sich spontan"
            className="h-72 w-full object-cover object-center sm:h-80"
            loading="lazy"
          />
          <div className="space-y-4 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800/80">Im echten Leben</p>
            <h3 className="text-xl font-bold text-slate-950 sm:text-2xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              Für Leute mit Freundeskreis, aber ohne Lust auf Organisationsmüdigkeit.
            </h3>
            <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Realite ist für spontane Abende, bestehende Kontakte, kleine Gruppen und echte Aktivitäten. Nicht für endlose Chats, nicht für einen Feed voller Fremder.
            </p>
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {AUDIENCE_STORIES.map((persona, index) => (
            <article
              key={persona.label}
              className="realite-reveal rounded-2xl border border-slate-200 bg-white/78 p-4 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.24)] backdrop-blur-sm sm:p-5"
              style={{ animationDelay: `${1280 + index * 70}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-900/10 bg-[#edf6f1] text-xl" aria-hidden="true">
                  {persona.emoji}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-950 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                    {persona.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">{persona.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
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
        <p className="inline-flex rounded-full border border-emerald-900/10 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
          So einfach geht&apos;s
        </p>
        <h2 className="mt-3 text-2xl font-black text-slate-950 sm:text-3xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
          In 3 Schritten zum ersten echten Erlebnis.
        </h2>
      </div>
      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <article
            key={step.title}
            className="realite-reveal relative rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-[0_22px_60px_-38px_rgba(15,23,42,0.30)] backdrop-blur-sm sm:rounded-3xl sm:p-6"
            style={{ animationDelay: `${840 + index * 120}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-5xl font-black leading-none text-amber-700/70 [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
                {step.step}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                {step.badge}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-950 sm:text-xl [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
          </article>
        ))}
      </div>

      <div
        className="realite-reveal mt-10 overflow-hidden rounded-[32px] border border-emerald-950/15 bg-[linear-gradient(135deg,#163628_0%,#214533_38%,#d97745_140%)] p-6 shadow-[0_30px_90px_-40px_rgba(6,78,59,0.7)] sm:mt-12 sm:p-8 lg:p-10"
        style={{ animationDelay: "1220ms" }}
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-100">
              Jetzt kostenlos starten
            </p>
            <h2 className="mt-4 max-w-3xl text-[1.9rem] font-black leading-tight text-white sm:text-3xl lg:text-[3.4rem] [font-family:var(--font-heading,Space_Grotesk),Avenir_Next,sans-serif]">
              Dein nächstes spontanes Treffen ist einen Klick entfernt.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/90 sm:text-lg">
              Kostenlos, kein Download, in 30 Sekunden dabei. Dein Kalender bleibt privat und du behältst die Kontrolle darüber, wer etwas sieht.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={signInHref}
                className="inline-flex min-h-[54px] items-center justify-center rounded-2xl bg-[#f08b5f] px-8 py-3.5 text-base font-bold text-white shadow-[0_24px_60px_-30px_rgba(240,139,95,0.75)] transition hover:-translate-y-0.5 hover:bg-[#eb7d4f] active:translate-y-0 active:bg-[#df6e3f] sm:min-h-0 sm:py-3.5"
              >
                Kostenlos starten →
              </a>
              <a
                href="/docs/schnellstart"
                className="inline-flex min-h-[54px] items-center justify-center rounded-2xl border border-white/20 bg-white/8 px-6 py-3.5 text-base font-semibold text-white/92 transition hover:bg-white/14 active:bg-white/8 sm:min-h-0 sm:py-3.5"
              >
                Schnellstart lesen
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-emerald-50/80">
              <span>Keine Kreditkarte</span>
              <span>Kein Spam</span>
              <span>Google-Login jetzt, Kalender später optional</span>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
            <div className="overflow-hidden rounded-[22px] border border-white/10">
              <img
                src="/landing/realite-hero-photo.png"
                alt="Freunde treffen sich spontan in der Stadt"
                className="h-52 w-full object-cover object-center sm:h-64 lg:h-72"
                loading="lazy"
              />
            </div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-emerald-50/88">
              <div className="rounded-2xl bg-black/10 px-4 py-3">Kalender bleibt privat und wird nicht automatisch veröffentlicht.</div>
              <div className="rounded-2xl bg-black/10 px-4 py-3">Du entscheidest, wer eine Aktivität sehen oder ihr beitreten kann.</div>
              <div className="rounded-2xl bg-black/10 px-4 py-3">Der Einstieg ist schnell, aber die Sichtbarkeit bleibt bewusst und kontrollierbar.</div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
