import { notFound, redirect } from "next/navigation";

import { SharedEventContent } from "@/src/components/shared-event-content";
import { SuggestionDecisionPanel } from "@/src/components/suggestion-decision-panel";
import { getSuggestionForUser } from "@/src/lib/repository";
import { enlargeUUID, shortenUUID } from "@/src/lib/utils/short-uuid";
import { requireAppUser } from "@/src/lib/session";

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
        title={suggestion.title}
        startsAtIso={suggestion.startsAt.toISOString()}
        endsAtIso={suggestion.endsAt.toISOString()}
        description={suggestion.description}
        location={suggestion.location}
        tags={suggestion.tags}
        createdByName={suggestion.createdByName}
        createdByEmail={suggestion.createdByEmail}
      />

      <div className="mt-4">
        <SuggestionDecisionPanel
          suggestionId={suggestion.id}
          initialStatus={suggestion.status}
          initialReasons={suggestion.decisionReasons}
          initialNote={suggestion.decisionNote}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm text-slate-600">Warum wurde dir das vorgeschlagen?</p>
        <p className="mt-2 text-sm text-slate-800">{suggestion.reason}</p>
      </section>
    </main>
  );
}
