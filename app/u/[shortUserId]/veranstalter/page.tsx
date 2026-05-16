import { notFound } from "next/navigation";

import { AppShell } from "@/src/components/app-shell";
import { OrganizerEventActions } from "@/src/components/organizer-event-actions";
import { OrganizerProfileEditor } from "@/src/components/organizer-profile-editor";
import {
  getAcceptedUsersForEventIds,
  getOrganizerAnalyticsSummaryForEvents,
  getOrganizerOverview,
} from "@/src/lib/repository";
import { resolveProfileImageReadUrl } from "@/src/lib/profile-image-storage";
import { requireAppUser } from "@/src/lib/session";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OrganizerProfilePage({
  params,
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
  const isOwner = viewer?.id === profileUserId;
  const overview = await getOrganizerOverview({
    profileUserId,
    viewerUserId: isOwner && viewer ? viewer.id : null,
  });
  if (!overview) {
    notFound();
  }

  if (!isOwner && !overview.organizerProfile?.enabled) {
    notFound();
  }

  const eventIds = overview.events.map((event) => event.id);
  const [acceptedByEventId, analyticsByEventId] = await Promise.all([
    getAcceptedUsersForEventIds(eventIds),
    getOrganizerAnalyticsSummaryForEvents({
      organizerUserId: profileUserId,
      eventIds,
      days: 30,
    }),
  ]);

  const displayName =
    overview.organizerProfile?.displayName?.trim() ||
    overview.profile.name?.trim() ||
    "Veranstalter";
  const bio = overview.organizerProfile?.bio?.trim() ?? null;
  const websiteUrl = overview.organizerProfile?.websiteUrl?.trim() ?? null;

  const content = (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Veranstalter</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{displayName}</h1>
        {bio ? <p className="mt-2 text-sm text-muted-foreground">{bio}</p> : null}
        {websiteUrl ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Website besuchen
          </a>
        ) : null}
      </header>

      {isOwner ? (
        <div className="mt-6">
          <OrganizerProfileEditor
            initialEnabled={overview.organizerProfile?.enabled ?? false}
            initialDisplayName={overview.organizerProfile?.displayName ?? null}
            initialBio={overview.organizerProfile?.bio ?? null}
            initialWebsiteUrl={overview.organizerProfile?.websiteUrl ?? null}
          />
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Kommende Events</h2>
        <p className="mt-1 text-sm text-muted-foreground">{overview.events.length} sichtbar</p>
        <div className="mt-4 space-y-3">
          {overview.events.map((event) => {
            const shortEventId = shortenUUID(event.id);
            const eventPath = `/e/${encodeURIComponent(shortEventId)}`;
            const analytics = analyticsByEventId.get(event.id) ?? {
              views: 0,
              shares: 0,
              qrPrintViews: 0,
            };
            const acceptedCount = acceptedByEventId.get(event.id)?.length ?? 0;
            return (
              <article key={event.id} className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <a href={eventPath} className="font-semibold text-foreground hover:text-teal-700">
                      {event.title}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(event.startsAt)} · {event.startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {event.location ? (
                      <p className="mt-1 text-xs text-muted-foreground">Ort: {event.location}</p>
                    ) : null}
                  </div>
                  <a href={`${eventPath}/qr`} className="text-xs font-semibold text-teal-700 hover:text-teal-800">
                    QR & Poster drucken
                  </a>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                    Aufrufe (30d): {analytics.views}
                  </span>
                  <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                    Shares (30d): {analytics.shares}
                  </span>
                  <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                    QR/Poster (30d): {analytics.qrPrintViews}
                  </span>
                  <span className="rounded-full bg-background px-2 py-1 text-muted-foreground">
                    Zusagen: {acceptedCount}
                  </span>
                </div>

                <OrganizerEventActions
                  eventId={event.id}
                  eventUrl={eventPath}
                />
              </article>
            );
          })}
          {overview.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine kommenden Events sichtbar.</p>
          ) : null}
        </div>
      </section>
    </main>
  );

  if (viewer) {
    const viewerAvatarUrl = await resolveProfileImageReadUrl(viewer.image);
    return (
      <AppShell
        user={{
          name: viewer.name ?? viewer.email,
          email: viewer.email,
          image: viewerAvatarUrl ?? viewer.image,
        }}
      >
        {content}
      </AppShell>
    );
  }

  return <div className="min-h-screen bg-muted">{content}</div>;
}
