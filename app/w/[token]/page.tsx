import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buildLoginPath } from "@/src/lib/provider-adapters";
import {
  getWeeklyShareCampaignByToken,
  listWeeklySharePublicActivities,
  recordWeeklyShareVisit,
} from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { shortenUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

function getOwnerLabel(ownerName: string | null, ownerEmail: string) {
  return ownerName?.trim() || ownerEmail.split("@")[0] || "Jemand";
}

function parseOpenIntentions(value: string | null | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function formatActivityTime(startsAt: Date, endsAt: Date) {
  const day = startsAt.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const start = startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const end = endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${start}-${end}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const campaign = await getWeeklyShareCampaignByToken(token);
  const owner = campaign ? getOwnerLabel(campaign.ownerName, campaign.ownerEmail) : "Jemand";
  const path = `/w/${encodeURIComponent(token)}`;
  const imagePath = `${path}/opengraph-image`;
  const title = `${owner} teilt Vorhaben auf Realite`;
  const description = "Sieh, was diese Woche wirklich passieren soll, und mach mit statt nur im Chat zu planen.";

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title,
      description,
      images: [{ url: imagePath, width: 1200, height: 630, alt: "Wochenstatus auf Realite" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

export default async function WeeklySharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const campaign = await getWeeklyShareCampaignByToken(token);
  if (!campaign) {
    notFound();
  }

  const user = await requireAppUser();
  const requestHeaders = await headers();

  if (user) {
    await recordWeeklyShareVisit({
      token,
      visitorUserId: user.id,
      referrer: requestHeaders.get("referer"),
      userAgent: requestHeaders.get("user-agent"),
    });
  } else {
    await recordWeeklyShareVisit({
      token,
      referrer: requestHeaders.get("referer"),
      userAgent: requestHeaders.get("user-agent"),
    });
  }

  const owner = getOwnerLabel(campaign.ownerName, campaign.ownerEmail);
  const isOwner = user?.id === campaign.ownerUserId;
  const loginPath = buildLoginPath(`/w/${encodeURIComponent(token)}`);
  const [activities] = await Promise.all([
    listWeeklySharePublicActivities(campaign.ownerUserId),
  ]);
  const openIntentions = parseOpenIntentions(campaign.openIntentions);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4efe2] text-[#231f18]">
      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-14">
        <div className="absolute -right-24 top-6 h-64 w-64 rounded-full bg-teal-400/25 blur-3xl" aria-hidden />
        <div className="absolute -left-20 top-52 h-72 w-72 rounded-full bg-orange-300/35 blur-3xl" aria-hidden />

        <nav className="relative z-10 flex items-center justify-between text-sm">
          <Link href="/" className="font-bold text-teal-800">
            Realite
          </Link>
          <Link href="/docs/events-und-matching" className="font-semibold text-[#71624d] hover:text-[#231f18]">
            Wie funktioniert das?
          </Link>
        </nav>

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <section className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-teal-950/10 backdrop-blur sm:p-8">
            <p className="inline-flex rounded-full bg-teal-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-50">
              Wochenstatus
            </p>
            <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              {owner}s Woche kann richtig gut werden.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-[#5c5142]">
              Realite macht aus losen Ideen konkrete Treffen. Such dir ein Vorhaben aus, mach direkt mit und hilf dabei,
              dass gutes Sozialleben mühelos passiert.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Link
                  href={isOwner ? "/events" : "/now"}
                  className="inline-flex justify-center rounded-2xl bg-teal-800 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 hover:bg-teal-900"
                >
                  {isOwner ? "Meine Vorhaben öffnen" : "In Realite ansehen"}
                </Link>
              ) : (
                <a
                  href={loginPath}
                  className="inline-flex justify-center rounded-2xl bg-teal-800 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 hover:bg-teal-900"
                >
                  Anmelden und mitmachen
                </a>
              )}
              <Link
                href="/"
                className="inline-flex justify-center rounded-2xl border border-[#d8cbb4] bg-white/65 px-5 py-3 text-sm font-bold text-[#4b412f] hover:bg-white"
              >
                Was ist Realite?
              </Link>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#756955]">
              Nichts wird automatisch in deinem Namen geteilt. Wenn du dich anmeldest, sieht {owner} dich als Kontakt,
              weil du diesen Link bewusst geöffnet hast.
            </p>
          </section>

          <aside className="relative rounded-[2rem] bg-[#201b16] p-5 text-white shadow-2xl shadow-orange-950/20">
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-orange-400" aria-hidden />
            <div className="absolute bottom-8 right-8 h-16 w-16 rounded-full border-8 border-teal-300/80" aria-hidden />
            <div className="relative grid gap-4">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <a
                    key={activity.id}
                    href={`/e/${shortenUUID(activity.id)}`}
                    className="block rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.12]"
                    style={{ transform: `translateX(${Math.min(index, 2) * 12}px)` }}
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100/80">
                      {formatActivityTime(activity.startsAt, activity.endsAt)}
                    </p>
                    <p className="mt-2 text-2xl font-black">{activity.title.replace(/#[^\s]+/gi, "").trim()}</p>
                    <p className="mt-1 text-sm text-white/65">
                      {activity.location?.trim() ? `${activity.location} · ` : ""}Direkt öffnen und mitmachen.
                    </p>
                  </a>
                ))
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100/80">Noch offen</p>
                  <p className="mt-2 text-2xl font-black">Frag nach einem Plan</p>
                  <p className="mt-1 text-sm text-white/65">Hier erscheinen öffentliche Vorhaben, sobald sie geteilt sind.</p>
                </div>
              )}
              {openIntentions.map((intention, index) => (
                <a
                  key={`${intention}-${index}`}
                  href={user ? "/now" : loginPath}
                  className="block rounded-3xl border border-orange-200/30 bg-orange-300/15 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:bg-orange-300/25"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-100/80">Offene Idee</p>
                  <p className="mt-2 text-2xl font-black">{intention}</p>
                  <p className="mt-1 text-sm text-white/65">Melde dich an und mach daraus ein echtes Treffen.</p>
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
