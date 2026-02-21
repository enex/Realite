import { EventLocationDetails } from "@/src/components/event-location-details";
import { stripRealiteCalendarMetadata } from "@/src/lib/realite-calendar-links";
import { sanitizeBasicHtml } from "@/src/lib/sanitize-basic-html";

type SharedEventContentProps = {
  title: string;
  startsAtIso: string;
  endsAtIso: string;
  description?: string | null;
  location?: string | null;
  groupName?: string | null;
  createdByShortId?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  isOwnedByCurrentUser?: boolean;
  sourceProvider?: string | null;
  sourceEventId?: string | null;
};

function buildGoogleCalendarEditUrl(sourceProvider?: string | null, sourceEventId?: string | null) {
  if (sourceProvider !== "google" || !sourceEventId) {
    return null;
  }

  const params = new URLSearchParams({
    sourceProvider: sourceProvider,
    sourceEventId: sourceEventId
  });

  return `/api/events/source-link?${params.toString()}`;
}

export function SharedEventContent(props: SharedEventContentProps) {
  const startsAt = new Date(props.startsAtIso);
  const endsAt = new Date(props.endsAtIso);
  const location = props.location?.trim() ?? "";
  const description = stripRealiteCalendarMetadata(props.description)?.trim() ?? "";
  const sanitizedDescriptionHtml = sanitizeBasicHtml(description);
  const originalEditUrl = props.isOwnedByCurrentUser
    ? buildGoogleCalendarEditUrl(props.sourceProvider, props.sourceEventId)
    : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{props.title}</h1>
          {props.groupName ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Gruppe: {props.groupName}</p>
          ) : null}
        </div>

        {originalEditUrl ? (
          <a
            href={originalEditUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Bearbeiten
          </a>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-slate-600 sm:text-base">
        {startsAt.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        })}{" "}
        · {startsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} bis{" "}
        {endsAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
      </p>

      {props.createdByEmail ? (
        <p className="mt-2 text-sm text-slate-500">
          Von{" "}
          {props.createdByShortId ? (
            <a href={`/u/${props.createdByShortId}`} className="font-medium text-teal-700 hover:text-teal-800">
              {props.createdByName ?? props.createdByEmail}
            </a>
          ) : (
            props.createdByName ?? props.createdByEmail
          )}
          {props.createdByName ? ` (${props.createdByEmail})` : ""}
        </p>
      ) : null}

      {location ? (
        <EventLocationDetails location={location} />
      ) : (
        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Ort</p>
          <p className="mt-1 text-sm text-slate-600">Kein Ort angegeben.</p>
        </section>
      )}

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Beschreibung</p>
        {sanitizedDescriptionHtml ? (
          <div
            className="mt-1 whitespace-pre-wrap text-sm text-slate-700 [&_a]:font-medium [&_a]:text-teal-700 [&_a]:underline hover:[&_a]:text-teal-800 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
          />
        ) : (
          <p className="mt-1 text-sm text-slate-700">Keine Beschreibung vorhanden.</p>
        )}
      </section>
    </section>
  );
}
