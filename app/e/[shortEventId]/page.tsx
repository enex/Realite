import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SharedEventContent } from "@/src/components/shared-event-content";
import { SuggestionDecisionPanel } from "@/src/components/suggestion-decision-panel";
import { getEventShareCopy, getPublicEventSharePreviewByShortId } from "@/src/lib/event-share";
import { getSuggestionForEventForUser, getVisibleEventForUserById } from "@/src/lib/repository";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";
import { requireAppUser } from "@/src/lib/session";

export async function generateMetadata({
  params
}: {
  params: Promise<{ shortEventId: string }>;
}): Promise<Metadata> {
  const { shortEventId } = await params;
  const preview = await getPublicEventSharePreviewByShortId(shortEventId);
  const copy = getEventShareCopy(preview);
  const imagePath = `/e/${encodeURIComponent(shortEventId)}/opengraph-image`;

  return {
    title: copy.title,
    description: copy.description,
    openGraph: {
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
    const callbackUrl = `/e/${encodeURIComponent(shortEventId)}`;
    redirect(`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const [event, suggestion] = await Promise.all([
    getVisibleEventForUserById({ userId: user.id, eventId }),
    getSuggestionForEventForUser({ userId: user.id, eventId })
  ]);

  if (!event) {
    notFound();
  }

  const suggestionForFlow = suggestion && event.createdBy !== user.id ? suggestion : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <a href="/" className="font-semibold text-teal-700 hover:text-teal-800">
          ← Zum Dashboard
        </a>
      </div>

      <SharedEventContent
        title={event.title}
        startsAtIso={event.startsAt.toISOString()}
        endsAtIso={event.endsAt.toISOString()}
        description={event.description}
        location={event.location}
        tags={event.tags}
        groupName={event.groupName}
        createdByName={event.createdByName}
        createdByEmail={event.createdByEmail}
      />

      {suggestionForFlow ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SuggestionDecisionPanel
            suggestionId={suggestionForFlow.id}
            initialStatus={suggestionForFlow.status}
            initialReasons={suggestionForFlow.decisionReasons}
            initialNote={suggestionForFlow.decisionNote}
          />
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Warum wurde dir das vorgeschlagen?</p>
            <p className="mt-2 text-sm text-slate-800">{suggestionForFlow.reason}</p>
          </div>
        </section>
      ) : suggestion ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm text-slate-700">
            Für dieses Event gibt es einen persönlichen Vorschlag mit Status <strong>{suggestion.status}</strong>.
          </p>
          <a
            href={`/s/${shortenUUID(suggestion.id)}`}
            className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Zur Suggestion-Antwortseite
          </a>
        </section>
      ) : null}
    </main>
  );
}
