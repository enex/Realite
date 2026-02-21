import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/src/components/app-shell";
import { UserAvatar } from "@/src/components/user-avatar";
import { getUserProfileOverview, type UserProfileEvent, type UserProfileVisibility } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

const MATCH_STATUS_LABEL: Record<"pending" | "calendar_inserted" | "accepted" | "declined", string> = {
  pending: "Gematcht",
  calendar_inserted: "Gematcht",
  accepted: "Zugesagt",
  declined: "Abgelehnt"
};

type ProfileEventListProps = {
  mode: UserProfileVisibility;
  events: UserProfileEvent[];
};

function formatDate(date: Date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function getModeCopy(mode: UserProfileVisibility) {
  if (mode === "owner") {
    return "Du siehst hier deine sichtbaren Events.";
  }

  if (mode === "matched") {
    return "Du siehst hier nur Events dieser Person, die mit dir gematcht wurden.";
  }

  return "Du siehst hier nur öffentliche #alle-Events. Für gematchte Events bitte anmelden.";
}

function ProfileEventList({ mode, events }: ProfileEventListProps) {
  if (!events.length) {
    if (mode === "owner") {
      return <p className="text-sm text-slate-600">Noch keine kommenden Events auf deinem Profil.</p>;
    }

    if (mode === "matched") {
      return <p className="text-sm text-slate-600">Aktuell gibt es keine gematchten, kommenden Events.</p>;
    }

    return <p className="text-sm text-slate-600">Aktuell gibt es keine öffentlichen #alle-Events.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <a
                href={`/e/${shortenUUID(event.id)}`}
                className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-teal-500"
              >
                {event.title}
              </a>
              <p className="mt-1 text-xs text-slate-600">
                {formatDate(event.startsAt)} · {formatTime(event.startsAt)} bis {formatTime(event.endsAt)}
              </p>
              {event.location ? <p className="mt-1 text-xs text-slate-600">Ort: {event.location}</p> : null}
              {event.groupName ? <p className="mt-1 text-xs text-slate-500">Gruppe: {event.groupName}</p> : null}
            </div>
            {mode === "matched" && event.matchStatus ? (
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                {MATCH_STATUS_LABEL[event.matchStatus]}
              </span>
            ) : null}
          </div>

          {event.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span key={`${event.id}-${tag}`} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ shortUserId: string }>;
}): Promise<Metadata> {
  const { shortUserId } = await params;

  let profileUserId = "";
  try {
    profileUserId = enlargeUUID(shortUserId);
  } catch {
    return {
      title: "Profil | Realite"
    };
  }

  const overview = await getUserProfileOverview({ profileUserId, viewerUserId: null });
  const profileName = overview?.profile.name?.trim() || "Realite Nutzer";
  const profileTitle = `${profileName} | Realite Profil`;
  const profileDescription = `Profilübersicht von ${profileName} mit zugänglichen Events.`;
  const profilePath = `/u/${encodeURIComponent(shortUserId)}`;

  return {
    title: profileTitle,
    description: profileDescription,
    alternates: {
      canonical: profilePath
    },
    openGraph: {
      type: "profile",
      url: profilePath,
      title: profileTitle,
      description: profileDescription,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Realite Profil" }]
    },
    twitter: {
      card: "summary_large_image",
      title: profileTitle,
      description: profileDescription,
      images: ["/opengraph-image"]
    }
  };
}

export default async function UserProfilePage({
  params
}: {
  params: Promise<{ shortUserId: string }>;
}) {
  const { shortUserId } = await params;
  let profileUserId = "";

  try {
    profileUserId = enlargeUUID(shortUserId);
  } catch {
    notFound();
  }

  const viewer = await requireAppUser();
  const overview = await getUserProfileOverview({
    profileUserId,
    viewerUserId: viewer?.id ?? null
  });

  if (!overview) {
    notFound();
  }

  const profileName = overview.profile.name?.trim() || "Realite Nutzer";
  const memberSince = formatDate(overview.profile.createdAt);
  const callbackUrl = `/u/${encodeURIComponent(shortUserId)}`;
  const modeHint = getModeCopy(overview.visibility);

  const content = (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <UserAvatar name={overview.profile.name} image={overview.profile.image} size="lg" />
            <div>
              <p className="text-sm text-slate-500">Profil</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{profileName}</h1>
              <p className="text-xs text-slate-500">Mitglied seit {memberSince}</p>
            </div>
          </div>
          {!viewer ? (
            <a
              href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Für Matches anmelden
            </a>
          ) : null}
        </div>

        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{modeHint}</p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Kommende Events</h2>
        <p className="mt-1 text-sm text-slate-500">{overview.events.length} sichtbar</p>
        <div className="mt-4">
          <ProfileEventList mode={overview.visibility} events={overview.events} />
        </div>
      </section>
    </main>
  );

  if (viewer) {
    return (
      <AppShell
        user={{
          name: viewer.name ?? viewer.email,
          email: viewer.email,
          image: viewer.image
        }}
      >
        {content}
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="/" className="text-sm font-semibold text-slate-800">
            Realite
          </a>
          <a href="/docs" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            Docs
          </a>
        </div>
      </div>
      {content}
    </div>
  );
}
