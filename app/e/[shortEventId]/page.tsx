import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventComments } from "@/src/components/event-comments";
import { EventInviteSection } from "@/src/components/event-invite-section";
import { EventPresencePanel } from "@/src/components/event-presence-panel";
import { SharedEventContent } from "@/src/components/shared-event-content";
import { SuggestionDecisionPanel } from "@/src/components/suggestion-decision-panel";
import { getCardSurfaceMeta } from "@/src/lib/card-system";
import { getEventShareCopy, getPublicEventSharePreviewByShortId } from "@/src/lib/event-share";
import {
  getAcceptedUsersForEventIds,
  getEventPresenceSummary,
  getSuggestionForEventForUser,
  getVisibleEventForUserById
} from "@/src/lib/repository";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";
import { requireAppUser } from "@/src/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ shortEventId: string }>;
}): Promise<Metadata> {
  const { shortEventId } = await params;
  const preview = await getPublicEventSharePreviewByShortId(shortEventId);
  const copy = getEventShareCopy(preview);
  const eventPath = `/e/${encodeURIComponent(shortEventId)}`;
  const imagePath = `${eventPath}/opengraph-image`;

  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: eventPath
    },
    openGraph: {
      type: "article",
      url: eventPath,
      title: copy.title,
      description: copy.description,
      images: [{ url: imagePath, width: 1200, height: 630, alt: "Event auf Realite" }]
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [imagePath]
    }
  };
}

export default async function EventShortcutPage({
  params
}: {
  params: Promise<{ shortEventId: string }>;
}) {
  const { shortEventId } = await params;

  let eventId = "";
  try {
    eventId = enlargeUUID(shortEventId);
  } catch {
    notFound();
  }

  const user = await requireAppUser();

  if (!user) {
    const preview = await getPublicEventSharePreviewByShortId(shortEventId);
    if (!preview) {
      notFound();
    }
    const signInUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/e/${encodeURIComponent(shortEventId)}`)}`;
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/" className="font-semibold text-teal-700 hover:text-teal-800">
            ← Realite
          </Link>
        </div>

        <SharedEventContent
          title={preview.title.replace(/#[^\s]+/gi, "").trim()}
          startsAtIso={preview.startsAt.toISOString()}
          endsAtIso={preview.endsAt.toISOString()}
          description={preview.description}
          location={preview.location}
          joinMode={preview.joinMode}
          visibility="public"
          allowOnSiteVisibility={false}
          placeImageUrl={preview.placeImageUrl}
          linkPreviewImageUrl={preview.linkPreviewImageUrl}
          createdByName={preview.createdByName}
          createdByEmail={preview.createdByEmail}
          showCreatorEmail={false}
        />

        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">
            Melde dich an, um zuzusagen, abzusagen oder zu kommentieren.
          </p>
          <a
            href={signInUrl}
            className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Mit Google anmelden
          </a>
        </section>

        <EventComments
          eventId={preview.id}
          allowGuestView
          signInCallbackPath={`/e/${shortEventId}`}
        />
      </main>
    );
  }

  const [event, suggestion, acceptedByEventId] = await Promise.all([
    getVisibleEventForUserById({ userId: user.id, eventId }),
    getSuggestionForEventForUser({ userId: user.id, eventId }),
    getAcceptedUsersForEventIds([eventId]),
  ]);

  if (!event) {
    notFound();
  }

  const presenceSummary = event.allowOnSiteVisibility
    ? await getEventPresenceSummary({ userId: user.id, eventId })
    : null;

  const acceptedBy = acceptedByEventId.get(eventId) ?? [];
  const suggestionForFlow = suggestion && event.createdBy !== user.id ? suggestion : null;
  const activityCard = getCardSurfaceMeta("activity");
  const suggestionCard = getCardSurfaceMeta("suggestion");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/" className="font-semibold text-teal-700 hover:text-teal-800">
          ← Zum Dashboard
        </Link>
      </div>

      <SharedEventContent
        title={event.title.replace(/#[^\s]+/gi, "").trim()}
        startsAtIso={event.startsAt.toISOString()}
        endsAtIso={event.endsAt.toISOString()}
        description={event.description}
        location={event.location}
        joinMode={event.joinMode}
        visibility={event.visibility}
        allowOnSiteVisibility={event.allowOnSiteVisibility}
        placeImageUrl={event.placeImageUrl}
        linkPreviewImageUrl={event.linkPreviewImageUrl}
        groupName={event.groupName}
        createdByShortId={shortenUUID(event.createdBy)}
        createdByName={event.createdByName}
        createdByEmail={event.createdByEmail}
        isOwnedByCurrentUser={event.createdBy === user.id}
        showCreatorEmail
        sourceProvider={event.sourceProvider}
        sourceEventId={event.sourceEventId}
      />

      {acceptedBy.length > 0 && (
        <section className={`mt-4 ${activityCard.insetClassName}`}>
          <p className="text-sm font-semibold text-slate-900">Zusagen</p>
          <p className="mt-1 text-sm text-slate-700">
            Zugesagt: {acceptedBy.map((u) => u.name ?? u.email).join(", ")}
          </p>
        </section>
      )}

      {event.allowOnSiteVisibility && presenceSummary ? (
        <EventPresencePanel
          eventId={event.id}
          startsAtIso={event.startsAt.toISOString()}
          endsAtIso={event.endsAt.toISOString()}
          visibility={event.visibility}
          groupName={event.groupName}
          initialStatus={presenceSummary.currentUserStatus}
          initialVisibleUntilIso={
            presenceSummary.currentUserVisibleUntil?.toISOString() ?? null
          }
          initialCheckedInUsers={presenceSummary.checkedInUsers.map((entry) => ({
            userId: entry.userId,
            name: entry.name,
            email: entry.email,
            visibleUntilIso: entry.visibleUntil.toISOString(),
          }))}
        />
      ) : null}

      {event.createdBy === user.id &&
        event.sourceProvider === "google" &&
        event.sourceEventId && (
          <section className="mt-4">
            <EventInviteSection eventId={event.id} currentUserEmail={user.email} />
          </section>
        )}

      {suggestionForFlow ? (
        <section className={`mt-4 ${suggestionCard.sectionClassName} sm:p-6`}>
          {suggestionForFlow.status === "accepted" && (
            <p className="mb-4 text-sm font-medium text-teal-700">Du hast diesem Termin zugesagt.</p>
          )}
          <SuggestionDecisionPanel
            suggestionId={suggestionForFlow.id}
            initialStatus={suggestionForFlow.status}
            initialReasons={suggestionForFlow.decisionReasons}
            initialNote={suggestionForFlow.decisionNote}
            creatorName={event.createdByName ?? event.createdByEmail}
          />
          <div className={`mt-4 ${activityCard.insetClassName}`}>
            <p className="text-sm text-slate-600">Warum wurde dir das vorgeschlagen?</p>
            <p className="mt-2 text-sm text-slate-800">{suggestionForFlow.reason}</p>
          </div>
        </section>
      ) : suggestion ? (
        <section className={`mt-4 ${suggestionCard.sectionClassName} sm:p-6`}>
          <p className="text-sm text-slate-700">
            Für dieses Event gibt es einen persönlichen Vorschlag mit Status <strong>{suggestion.status}</strong>.
          </p>
          <Link
            href={`/s/${shortenUUID(suggestion.id)}`}
            className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Zur Suggestion-Antwortseite
          </Link>
        </section>
      ) : null}

      <EventComments eventId={event.id} />
    </main>
  );
}
