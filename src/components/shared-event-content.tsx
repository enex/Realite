"use client";

import { EventImage } from "@/src/components/event-image";
import { EventLocationDetails } from "@/src/components/event-location-details";
import { getEventJoinModeMeta, type EventJoinMode } from "@/src/lib/event-join-modes";
import { getEventOnSiteVisibilityMeta } from "@/src/lib/event-on-site";
import { getEventVisibilityMeta, type EventVisibility } from "@/src/lib/event-visibility";
import {
  detailBodyClassName,
  detailLabelClassName,
  getPageIntentMeta,
  pageMetaClassName,
  pageTitleClassName,
  surfaceShellClassName,
} from "@/src/lib/page-hierarchy";
import { stripRealiteCalendarMetadata } from "@/src/lib/realite-calendar-links";
import { sanitizeBasicHtml } from "@/src/lib/sanitize-basic-html";
import { getVisualPriorityMeta } from "@/src/lib/visual-priority";

type SharedEventContentProps = {
  title: string;
  startsAtIso: string;
  endsAtIso: string;
  description?: string | null;
  location?: string | null;
  joinMode?: EventJoinMode | null;
  visibility?: EventVisibility | null;
  allowOnSiteVisibility?: boolean | null;
  /** Bild des Ortes (z. B. Venue). */
  placeImageUrl?: string | null;
  /** Link-Preview-Bild aus der Beschreibung. */
  linkPreviewImageUrl?: string | null;
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

function EventCoverImage({
  placeImageUrl,
  linkPreviewImageUrl,
}: {
  placeImageUrl?: string | null;
  linkPreviewImageUrl?: string | null;
}) {
  const coverUrl = placeImageUrl ?? linkPreviewImageUrl ?? null;
  if (!coverUrl) return null;

  return (
    <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl sm:-mx-6 sm:-mt-6">
      <EventImage
        src={coverUrl}
        className="h-44 w-full object-cover sm:h-52"
        sizes="(max-width: 640px) 100vw, 672px"
      />
    </div>
  );
}

export function SharedEventContent(props: SharedEventContentProps) {
  const startsAt = new Date(props.startsAtIso);
  const endsAt = new Date(props.endsAtIso);
  const location = props.location?.trim() ?? "";
  const description = stripRealiteCalendarMetadata(props.description)?.trim() ?? "";
  const sanitizedDescriptionHtml = sanitizeBasicHtml(description);
  const joinModeMeta = props.joinMode ? getEventJoinModeMeta(props.joinMode) : null;
  const visibilityMeta = props.visibility
    ? getEventVisibilityMeta(props.visibility)
    : null;
  const managementPage = getPageIntentMeta("manage");
  const onSiteMeta = getEventOnSiteVisibilityMeta(Boolean(props.allowOnSiteVisibility));
  const originalEditUrl = props.isOwnedByCurrentUser
    ? buildGoogleCalendarEditUrl(props.sourceProvider, props.sourceEventId)
    : null;

  return (
    <section className={`${surfaceShellClassName} p-5 sm:p-6`}>
      <EventCoverImage
        placeImageUrl={props.placeImageUrl}
        linkPreviewImageUrl={props.linkPreviewImageUrl}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {props.groupName ? (
            <p className={managementPage.eyebrowClassName}>Gruppe: {props.groupName}</p>
          ) : null}
          <h1
            className={`${props.groupName ? pageTitleClassName : "text-2xl font-semibold tracking-tight text-slate-900"} sm:text-3xl`}
          >
            {props.title}
          </h1>
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

      <p className={`${detailBodyClassName} sm:text-base`}>
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
        <p className={pageMetaClassName}>
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

      {joinModeMeta ? (
        <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("reaction").insetClassName}`}>
          <p className={detailLabelClassName}>Mitmachen</p>
          <p className={detailBodyClassName}>
            <span className="font-medium text-teal-800">{joinModeMeta.label}</span> · {joinModeMeta.description}
          </p>
        </section>
      ) : null}

      {visibilityMeta ? (
        <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("neutral").insetClassName}`}>
          <p className={detailLabelClassName}>Sichtbarkeit</p>
          <p className={detailBodyClassName}>
            <span className="font-medium text-slate-900">{visibilityMeta.label}</span> ·{" "}
            {visibilityMeta.description}
          </p>
        </section>
      ) : null}

      <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("momentum").insetClassName}`}>
        <p className={detailLabelClassName}>Vor Ort</p>
        <p className={detailBodyClassName}>
          <span className="font-medium text-slate-900">{onSiteMeta.label}</span> ·{" "}
          {onSiteMeta.description}
        </p>
      </section>

      {location ? (
        <EventLocationDetails location={location} />
      ) : (
        <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("neutral").insetClassName}`}>
          <p className={detailLabelClassName}>Ort</p>
          <p className={detailBodyClassName}>Kein Ort angegeben.</p>
        </section>
      )}

      <section className={`mt-4 rounded-xl border p-4 ${getVisualPriorityMeta("neutral").insetClassName}`}>
        <p className={detailLabelClassName}>Beschreibung</p>
        {sanitizedDescriptionHtml ? (
          <div
            className={`${detailBodyClassName} whitespace-pre-wrap [&_a]:font-medium [&_a]:text-teal-700 [&_a]:underline hover:[&_a]:text-teal-800 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6`}
            dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
          />
        ) : (
          <p className={detailBodyClassName}>Keine Beschreibung vorhanden.</p>
        )}
      </section>
    </section>
  );
}
