import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EventInviteSection } from "@/src/components/event-invite-section";
import { SharedEventContent } from "@/src/components/shared-event-content";
import { SuggestionDecisionPanel } from "@/src/components/suggestion-decision-panel";
import { getAuthSession } from "@/src/lib/auth";
import { stripRealiteCalendarMetadata } from "@/src/lib/realite-calendar-links";
import { getSuggestionForUser, getUserByEmail } from "@/src/lib/repository";
import { requireAppUser } from "@/src/lib/session";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";

export const dynamic = "force-dynamic";

const FALLBACK_TITLE = "Vorschlag | Realite";
const FALLBACK_DESCRIPTION = "Event-Vorschlag auf Realite. Melde dich an, um Details zu sehen.";
const OG_DESCRIPTION_MAX_LENGTH = 160;

function suggestionTitle(title: string): string {
  return title.replace(/#[^\s]+/gi, "").trim() || FALLBACK_TITLE;
}

function suggestionDescription(description: string | null): string {
  const cleaned = stripRealiteCalendarMetadata(description)?.trim() ?? "";
  if (cleaned.length <= OG_DESCRIPTION_MAX_LENGTH) return cleaned;
  return cleaned.slice(0, OG_DESCRIPTION_MAX_LENGTH - 3) + "...";
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ shortSuggestionId: string }>;
}): Promise<Metadata> {
  const { shortSuggestionId } = await params;

  let suggestionId = "";
  try {
    suggestionId = enlargeUUID(shortSuggestionId);
  } catch {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }

  const session = await getAuthSession();
  const email = session?.user?.email;
  if (!email) {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }

  const suggestion = await getSuggestionForUser(suggestionId, user.id);
  if (!suggestion) {
    return { title: FALLBACK_TITLE, description: FALLBACK_DESCRIPTION };
  }

  const title = suggestionTitle(suggestion.title);
  const description = suggestionDescription(suggestion.description);
  const path = `/s/${encodeURIComponent(shortSuggestionId)}`;

  return {
    title,
    description: description || FALLBACK_DESCRIPTION,
    openGraph: {
      url: path,
      title,
      description: description || FALLBACK_DESCRIPTION
    },
    twitter: {
      title,
      description: description || FALLBACK_DESCRIPTION
    }
  };
}

export default async function SuggestionShortcutPage({
  params
}: {
  params: Promise<{ shortSuggestionId: string }>;
}) {
  const { shortSuggestionId } = await params;

  let suggestionId = "";
  try {
    suggestionId = enlargeUUID(shortSuggestionId);
  } catch {
    notFound();
  }

  const user = await requireAppUser();
  if (!user) {
    const callbackUrl = `/s/${encodeURIComponent(shortSuggestionId)}`;
    redirect(`/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const suggestion = await getSuggestionForUser(suggestionId, user.id);
  if (!suggestion) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <a href={`/e/${shortenUUID(suggestion.eventId)}`} className="font-semibold text-teal-700 hover:text-teal-800">
          Zur Eventseite
        </a>
      </div>

      <SharedEventContent
        title={suggestion.title.replace(/#[^\s]+/gi, "").trim()}
        startsAtIso={suggestion.startsAt.toISOString()}
        endsAtIso={suggestion.endsAt.toISOString()}
        description={suggestion.description}
        location={suggestion.location}
        createdByShortId={shortenUUID(suggestion.createdBy)}
        createdByName={suggestion.createdByName}
        createdByEmail={suggestion.createdByEmail}
      />

      <div className="mt-4">
        <SuggestionDecisionPanel
          suggestionId={suggestion.id}
          initialStatus={suggestion.status}
          initialReasons={suggestion.decisionReasons}
          initialNote={suggestion.decisionNote}
          creatorName={suggestion.createdByName ?? suggestion.createdByEmail}
        />
      </div>

      {suggestion.createdBy === user.id &&
        suggestion.sourceProvider === "google" &&
        suggestion.sourceEventId && (
          <section className="mt-4">
            <EventInviteSection eventId={suggestion.eventId} />
          </section>
        )}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Warum wurde dir das vorgeschlagen?</p>
        <p className="mt-2 text-sm text-slate-800">{suggestion.reason}</p>
      </section>
    </main>
  );
}
